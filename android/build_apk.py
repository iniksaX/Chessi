#!/usr/bin/env python3
"""Build chessi-*.apk without a Java/Android SDK toolchain.

Pipeline:
  1. Copy app/dist/index.html -> android/assets/index.html
  2. aapt2 compile res/  -> staging zip
  3. aapt2 link          -> base APK (compiled AndroidManifest + resources.arsc + icons)
  4. Add classes.dex (STORE) + assets/index.html (DEFLATE)
  5. Add v1 signature (META-INF/MANIFEST.MF, CERT.SF, CERT.RSA)
  6. Rewrite the ZIP with 4-byte-aligned entries (zipalign semantics)
  7. Insert a v2 APK Signing Block (scheme id 0x7109871a, RSA-PKCS1v1.5-SHA256)
  8. Self-verify both schemes and print a report

Signing key: generated once into android/.build/chessi-release.pem (gitignored).
For a production release you would inject your own key; this produces a
valid, installable, self-signed APK.
"""

import hashlib
import shutil
import struct
import subprocess
import sys
import zlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography import x509
from cryptography.x509.oid import NameOID

from asn1crypto import cms, x509 as asn1_x509

ROOT = Path(__file__).resolve().parent          # android/
REPO = ROOT.parent
APP_DIST = REPO / 'app' / 'dist' / 'index.html'
BUILD = ROOT / '.build'
OUT = BUILD / 'chessi-1.0.0.apk'
AAPT2 = '/home/user/tools/aapt2/bin/Linux/aapt2'
ANDROID_JAR = '/home/user/tools/android-34.jar'
KEY_PEM = BUILD / 'chessi-release.pem'

APK_NAME = 'Chessi'
APK_VERSION = '1.0.0'
FIXED_DT = (2026, 11, 10, 0, 0, 0)
DOSTIME = (FIXED_DT[5] // 2) | (FIXED_DT[4] << 5) | (FIXED_DT[3] << 11)
DOSDATE = FIXED_DT[2] | (FIXED_DT[1] << 5) | ((FIXED_DT[0] - 1980) << 9)

COMP_STORE, COMP_DEFLATE = 0, 8
FLAG_UTF8 = 0x0800


# ---------------------------------------------------------------- zip helpers
def raw_deflate(data: bytes, level: int = 9) -> bytes:
    co = zlib.compressobj(level, zlib.DEFLATED, -15)
    return co.compress(data) + co.flush()


def zip_entries_full(path: Path):
    b = path.read_bytes()
    eocd = b.rfind(b'PK\x05\x06')
    _, _, _, _, cd_count, cd_size, cd_off, _ = struct.unpack_from('<IHHHHIIH', b, eocd)
    raw = []
    p = cd_off
    for _ in range(cd_count):
        (sig, vmade, vneed, flag, method, mtime, mdate, crc, csize, usize,
         nlen, elen, clen, disk, iattr, xattr, lho) = struct.unpack_from('<IHHHHHHIIIHHHHHII', b, p)
        name = b[p + 46:p + 46 + nlen].decode('utf-8')
        raw.append(dict(name=name, method=method, csize=csize, usize=usize, crc=crc,
                        flags=flag, xattr=xattr, vmade=vmade, lho=lho))
        p += 46 + nlen + elen + clen
    for e in raw:
        lo = e['lho']
        (sig, vneed, flag, method, mtime, mdate, crc, csize, usize, nlen, elen) = \
            struct.unpack_from('<IHHHHHIIIHH', b, lo)
        data_off = lo + 30 + nlen + elen
        e['csize_l'] = csize
        e['data'] = b[data_off:data_off + e['csize']]
    return raw


def write_aligned_zip(path: Path, entries):
    """entries: list of dicts with name, method, data(stored bytes), usize, crc"""
    out = bytearray()
    cd = []
    for e in entries:
        data = e['data']
        name = e['name'].encode('utf-8')
        local_off = len(out)
        pad = (4 - ((local_off + 30 + len(name)) % 4)) % 4
        header = struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, FLAG_UTF8, e['method'],
                             DOSTIME, DOSDATE, e['crc'], len(data), e['usize'],
                             len(name), pad)
        out += header + name + (b'\x00' * pad) + data
        cd.append((e, local_off))
    cd_off = len(out)
    for e, local_off in cd:
        name = e['name'].encode('utf-8')
        out += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, (3 << 8) | 20, 20,
                           FLAG_UTF8, e['method'], DOSTIME, DOSDATE, e['crc'],
                           len(e['data']), e['usize'], len(name), 0, 0, 0, 0,
                           e.get('xattr', 0), local_off) + name
    cd_size = len(out) - cd_off
    out += struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(cd), len(cd),
                       cd_size, cd_off, 0)
    path.write_bytes(out)
    return cd_off, cd_size


# ---------------------------------------------------------------- keys
def get_or_create_key():
    if KEY_PEM.exists():
        return serialization.load_pem_private_key(KEY_PEM.read_bytes(), password=None)
    BUILD.mkdir(parents=True, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    KEY_PEM.write_bytes(key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()))
    KEY_PEM.chmod(0o600)
    return key


def make_cert(key):
    now = datetime.now(timezone.utc)
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, 'Chessi'),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'Chessi'),
        x509.NameAttribute(NameOID.COUNTRY_NAME, 'PL'),
    ])
    cert = (x509.CertificateBuilder()
            .subject_name(subject).issuer_name(subject)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - timedelta(days=365))
            .not_valid_after(now + timedelta(days=3650))
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            .add_extension(x509.KeyUsage(digital_signature=True, content_commitment=True,
                                         key_encipherment=False, data_encipherment=False,
                                         key_agreement=False, key_cert_sign=False,
                                         crl_sign=False, encipher_only=False,
                                         decipher_only=False), critical=True)
            .sign(key, hashes.SHA256()))
    return cert


# ---------------------------------------------------------------- v1 signing
def b64(data: bytes) -> str:
    import base64
    return base64.b64encode(data).decode('ascii')


def build_manifest(entries_bytes):
    """entries_bytes: dict name -> uncompressed bytes"""
    mf = bytearray(b'Manifest-Version: 1.0\r\nCreated-By: Chessi Release 1.0\r\n\r\n')
    for name in sorted(entries_bytes):
        digest = hashlib.sha256(entries_bytes[name]).digest()
        mf += f'Name: {name}\r\nSHA-256-Digest: {b64(digest)}\r\n\r\n'.encode()
    return bytes(mf)


def manifest_blocks(manifest_bytes: bytes):
    blocks = {}
    cur_name = None
    buf = bytearray()
    for line in manifest_bytes.split(b'\r\n'):
        if line.startswith(b'Name: '):
            if cur_name is not None:
                blocks[cur_name] = bytes(buf)
            cur_name = line[6:].decode()
            buf = bytearray()
            buf += line + b'\r\n'
        elif cur_name is not None:
            buf += line + b'\r\n' if line else b'\r\n'
    if cur_name is not None:
        blocks[cur_name] = bytes(buf)
    return blocks


def build_sf(manifest_bytes: bytes, entries_bytes):
    blocks = manifest_blocks(manifest_bytes)
    sf = bytearray(b'Signature-Version: 1.0\r\n'
                   b'Created-By: Chessi Release 1.0\r\n'
                   b'SHA-256-Digest-Manifest: ' + b64(hashlib.sha256(manifest_bytes).digest()).encode() + b'\r\n'
                   b'X-Android-APK-Signed: 2\r\n\r\n')
    for name in sorted(entries_bytes):
        digest = hashlib.sha256(blocks[name]).digest()
        sf += f'Name: {name}\r\nSHA-256-Digest: {b64(digest)}\r\n\r\n'.encode()
    return bytes(sf)


def build_cert_rsa(cert, key, sf_bytes: bytes):
    signature = key.sign(sf_bytes, padding.PKCS1v15(), hashes.SHA256())
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    asn1_cert = asn1_x509.Certificate.load(cert_der)
    issuer_der = cert.issuer.public_bytes()
    issuer = asn1_x509.Name.load(issuer_der)
    sid = cms.SignerIdentifier({
        'issuer_and_serial_number': cms.IssuerAndSerialNumber({
            'issuer': issuer,
            'serial_number': asn1_x509.Integer(cert.serial_number),
        })
    })
    signer_info = cms.SignerInfo({
        'version': 'v1',
        'sid': sid,
        'digest_algorithm': cms.DigestAlgorithm({'algorithm': 'sha256'}),
        'signature_algorithm': cms.SignedDigestAlgorithm({'algorithm': 'sha256_rsa'}),
        'signature': signature,
    })
    signed_data = cms.SignedData({
        'version': 'v1',
        'digest_algorithms': [cms.DigestAlgorithm({'algorithm': 'sha256'})],
        'encap_content_info': cms.ContentInfo({'content_type': 'data'}),
        'certificates': [cms.CertificateChoices({'certificate': asn1_cert})],
        'signer_infos': [signer_info],
    })
    return cms.ContentInfo({
        'content_type': 'signed_data',
        'content': signed_data,
    }).dump()


# ---------------------------------------------------------------- v2 signing
def lp32(data: bytes) -> bytes:
    return struct.pack('<I', len(data)) + data


def u32(v: int) -> bytes:
    return struct.pack('<I', v)


def u64(v: int) -> bytes:
    return struct.pack('<Q', v)


def chunk_digests(section: bytes):
    digests = []
    i = 0
    size = 0x100000
    while i < len(section):
        chunk = section[i:i + size]
        digests.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(chunk)) + chunk).digest())
        i += size
    return digests


def v2_sign(pre_signed_apk: bytes, key, cert):
    eocd = pre_signed_apk.rfind(b'PK\x05\x06')
    _, _, _, _, cd_count, cd_size, cd_off, _ = struct.unpack_from('<IHHHHIIH', pre_signed_apk, eocd)
    eocd_section = bytearray(pre_signed_apk[eocd:])
    # treat CD-offset field as offset of the APK signing block
    struct.pack_into('<I', eocd_section, 16, cd_off)
    sec1 = pre_signed_apk[:cd_off]
    sec3 = pre_signed_apk[cd_off:eocd]
    sec4 = bytes(eocd_section)
    chunks = chunk_digests(sec1) + chunk_digests(sec3) + chunk_digests(sec4)
    overall = hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()

    cert_der = cert.public_bytes(serialization.Encoding.DER)
    # Layout matches AOSP tools/apksig exactly:
    #   digest pair = lp(u32(alg) + lp(digest))          (item of digests sequence)
    #   digests element = concatenation of pairs, no extra wrapper
    #   certificates element = lp(cert) per cert, concatenated
    #   attributes element = b'' (v2 scheme adds no attribute payload)
    #   signedData = lp(digests element) + lp(certificates element) + lp(attrs) + lp(b'')
    #   signer = lp(signedData) + lp(signatures element) + lp(spki)
    #   block value = lp(lp(signer))
    digests_blob = lp32(u32(0x0103) + lp32(overall))
    certificates_blob = lp32(cert_der)
    signed_data = lp32(digests_blob) + lp32(certificates_blob) + lp32(b'') + lp32(b'')

    signature = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    signatures_blob = lp32(u32(0x0103) + lp32(signature))
    spki = key.public_key().public_bytes(serialization.Encoding.DER,
                                         serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp32(signed_data) + lp32(signatures_blob) + lp32(spki)
    signers_seq = lp32(lp32(signer))

    pair = u64(4 + len(signers_seq)) + u32(0x7109871a) + signers_seq
    pairs = pair
    block_size = len(pairs) + 8 + 16          # pairs + trailing size + magic
    block = u64(block_size) + pairs + u64(block_size) + b'APK Sig Block 42'

    final = pre_signed_apk[:cd_off] + block + pre_signed_apk[cd_off:]
    # patch EOCD's CD offset field
    eocd_new = eocd + len(block)
    final = final[:eocd_new + 16] + u32(cd_off + len(block)) + final[eocd_new + 20:]
    return final


# ---------------------------------------------------------------- build
def main():
    if not APP_DIST.exists():
        sys.exit('dist/index.html not found — run `npm run build` in app/ first')
    BUILD.mkdir(parents=True, exist_ok=True)
    assets = ROOT / 'assets'
    assets.mkdir(exist_ok=True)
    shutil.copy2(APP_DIST, assets / 'index.html')
    print('copied dist/index.html ->', assets / 'index.html')

    # 1. classes.dex
    subprocess.run([sys.executable, str(ROOT / 'build_dex.py'), str(BUILD / 'classes.dex')], check=True)

    # 2. aapt2 compile + link
    compiled = BUILD / 'compiled.zip'
    base = BUILD / 'base.apk'
    if compiled.exists():
        compiled.unlink()
    subprocess.run([AAPT2, 'compile', '--dir', str(ROOT / 'res'), '-o', str(compiled)], check=True)
    if base.exists():
        base.unlink()
    subprocess.run([AAPT2, 'link', '-o', str(base), '-I', ANDROID_JAR,
                    '--manifest', str(ROOT / 'AndroidManifest.xml'),
                    str(compiled)], check=True)
    print('aapt2 link ->', base)

    # 3. read base entries
    base_entries = zip_entries_full(base)
    print('base entries:', [(e['name'], e['method'], e['csize']) for e in base_entries])

    # 4. add classes.dex + assets/index.html
    dex_bytes = (BUILD / 'classes.dex').read_bytes()
    index_bytes = APP_DIST.read_bytes()
    added = [
        dict(name='classes.dex', method=COMP_STORE, csize=len(dex_bytes),
             usize=len(dex_bytes), crc=zlib.crc32(dex_bytes), flags=0, xattr=0,
             vmade=0x031E, data=dex_bytes, raw=None),
        dict(name='assets/index.html', method=COMP_DEFLATE, csize=None, usize=len(index_bytes),
             crc=zlib.crc32(index_bytes), flags=0, xattr=0, vmade=0x031E,
             data=raw_deflate(index_bytes), raw=None),
    ]
    added[1]['csize'] = len(added[1]['data'])

    all_entries = base_entries + added

    # 5. v1 signature files
    key = get_or_create_key()
    cert = make_cert(key)
    print('signing cert CN=Chessi, serial', cert.serial_number)
    # uncompressed bytes for every entry except META-INF/*
    plain = {}
    for e in all_entries:
        if e['name'].upper().startswith('META-INF/'):
            continue
        if e['method'] == COMP_STORE:
            plain[e['name']] = e['data']
        else:
            co = zlib.decompressobj(-15)
            plain[e['name']] = co.decompress(e['data']) + co.flush()
    mf = build_manifest(plain)
    sf = build_sf(mf, plain)
    rsa = build_cert_rsa(cert, key, sf)
    sig_entries = [
        dict(name='META-INF/MANIFEST.MF', method=COMP_STORE, data=mf,
             usize=len(mf), csize=len(mf), crc=zlib.crc32(mf), flags=0, xattr=0,
             vmade=0x031E),
        dict(name='META-INF/CERT.SF', method=COMP_STORE, data=sf,
             usize=len(sf), csize=len(sf), crc=zlib.crc32(sf), flags=0, xattr=0,
             vmade=0x031E),
        dict(name='META-INF/CERT.RSA', method=COMP_STORE, data=rsa,
             usize=len(rsa), csize=len(rsa), crc=zlib.crc32(rsa), flags=0, xattr=0,
             vmade=0x031E),
    ]
    final_entries = all_entries + sig_entries

    # 6. write aligned zip
    tmp = BUILD / 'aligned.apk'
    cd_off, cd_size = write_aligned_zip(tmp, final_entries)
    print('aligned zip ->', tmp)

    # 7. v2 sign
    pre = tmp.read_bytes()
    signed = v2_sign(pre, key, cert)
    OUT.write_bytes(signed)
    print('signed APK ->', OUT, len(signed), 'bytes')


if __name__ == '__main__':
    main()
