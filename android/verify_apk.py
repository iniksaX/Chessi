#!/usr/bin/env python3
"""Self-verification of the signed APK, following the AOSP v2 verification steps."""

import hashlib
import struct
import sys
import zlib
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography import x509
from asn1crypto import cms as asn1cms, x509 as asn1_x509, keys as asn1_keys, core

MAGIC = b'APK Sig Block 42'


def fail(msg):
    print('FAIL:', msg)
    sys.exit(1)


def main(path):
    b = Path(path).read_bytes()
    print(f'APK: {path} ({len(b)} bytes)')

    # ---- EOCD
    eocd = b.rfind(b'PK\x05\x06')
    if eocd == -1:
        fail('no EOCD')
    sig, disk, cd_disk, de, te, cd_size, cd_off, comment_len = struct.unpack_from('<IHHHHIIH', b, eocd)
    print(f'EOCD: entries={te} cd_off={cd_off} cd_size={cd_size} comment={comment_len}')
    if eocd + 22 + comment_len != len(b):
        fail('trailing data after EOCD')

    # ---- signing block  (immediately before CD)
    magic_off = cd_off - 16
    if b[magic_off:magic_off + 16] != MAGIC:
        fail('APK Sig Block magic not immediately before central directory')
    trailing_size, = struct.unpack_from('<Q', b, magic_off - 8)
    block_end = magic_off + 16
    block_start = cd_off - trailing_size - 8
    leading_size, = struct.unpack_from('<Q', b, block_start)
    if leading_size != trailing_size:
        fail('size fields in APK signing block differ')
    if block_start + trailing_size + 8 != cd_off:
        fail('signing block size mismatch')
    print(f'signing block: off={block_start} size={trailing_size}')

    # ---- parse pairs
    p = block_start + 8
    end = magic_off - 8
    pairs = {}
    while p < end:
        (pair_len,) = struct.unpack_from('<Q', b, p)
        pair_id, = struct.unpack_from('<I', b, p + 8)
        pairs[pair_id] = b[p + 12:p + 8 + pair_len]
        p += 8 + pair_len
    print('pair ids:', [hex(k) for k in pairs])
    if 0x7109871a not in pairs:
        fail('no v2 block (0x7109871a)')

    # ---- parse v2 block
    def lp32(buf, at):
        (n,) = struct.unpack_from('<I', buf, at)
        return buf[at + 4:at + 4 + n], at + 4 + n

    v2 = pairs[0x7109871a]
    seq, _ = lp32(v2, 0)          # concat of lp(signerBlock)
    signer_blocks = []
    sp = 0
    while sp < len(seq):
        signer, sp = lp32(seq, sp)
        signer_blocks.append(signer)
    print('signers:', len(signer_blocks))
    v2_digest = None
    for signer in signer_blocks:
        sd, o = lp32(signer, 0)
        sigs_blob, o = lp32(signer, o)
        pubkey_der, o = lp32(signer, o)
        # signed data components: digests, certificates, attributes, (optional empty 4th)
        digests_el, o2 = lp32(sd, 0)
        certs_el, o2 = lp32(sd, o2)
        attrs_el, o2 = lp32(sd, o2)
        print('signedData bytes:', len(sd), 'trailing after attributes:', len(sd) - o2)
        digests = []
        dp = 0
        while dp < len(digests_el):
            pair, dp = lp32(digests_el, dp)
            alg, = struct.unpack_from('<I', pair, 0)
            dig, _ = lp32(pair, 4)
            digests.append((alg, dig))
        certs = []
        cp = 0
        while cp < len(certs_el):
            cert_der, cp = lp32(certs_el, cp)
            certs.append(cert_der)
        signatures = []
        sp2 = 0
        while sp2 < len(sigs_blob):
            pair, sp2 = lp32(sigs_blob, sp2)
            alg, = struct.unpack_from('<I', pair, 0)
            sig, _ = lp32(pair, 4)
            signatures.append((alg, sig))
        print('digest algs:', [hex(a) for a, _ in digests],
              'sig algs:', [hex(a) for a, _ in signatures],
              'certs:', len(certs))
        cert = x509.load_der_x509_certificate(certs[0])
        if cert.public_key().public_bytes(serialization.Encoding.DER,
                                          serialization.PublicFormat.SubjectPublicKeyInfo) != pubkey_der:
            fail('SPKI mismatch between certificate and signed public key')
        for alg, sig in signatures:
            if alg == 0x0103:
                algo, name = hashes.SHA256(), 'RSA-PKCS1v1.5-SHA256'
            elif alg == 0x0104:
                algo, name = hashes.SHA512(), 'RSA-PKCS1v1.5-SHA512'
            else:
                print('skipping unsupported alg', hex(alg))
                continue
            try:
                cert.public_key().verify(sig, sd, padding.PKCS1v15(), algo)
                print(f'signature over signed data: OK ({name})')
            except Exception as e:
                fail(f'signature verification failed: {e}')
        if [a for a, _ in digests] != [a for a, _ in signatures]:
            fail('digest and signature algorithm ID lists differ')
        v2_digest = dict(digests)

    # ---- recompute APK digest
    sec1 = b[:block_start]
    sec3 = b[cd_off:eocd]
    eocd_patched = bytearray(b[eocd:])
    struct.pack_into('<I', eocd_patched, 16, block_start)
    sec4 = bytes(eocd_patched)

    def section_chunk_digests(section):
        out = []
        i = 0
        while i < len(section):
            chunk = section[i:i + 0x100000]
            out.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(chunk)) + chunk).digest())
            i += 0x100000
        return out

    chunks = section_chunk_digests(sec1) + section_chunk_digests(sec3) + section_chunk_digests(sec4)
    overall = hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()
    if overall != v2_digest.get(0x0103):
        fail(f'APK digest mismatch (computed {overall.hex()}, signed {v2_digest.get(0x0103, b"?").hex()})')
    print('APK content digest: OK')

    # ---- v1 verification
    import zipfile
    import io
    zf = zipfile.ZipFile(path)
    names = zf.namelist()
    print('entries:', names)
    mf = zf.read('META-INF/MANIFEST.MF')
    sf = zf.read('META-INF/CERT.SF')
    rsa = zf.read('META-INF/CERT.RSA')

    def parse_sections(text: bytes):
        text = text.decode('utf-8').replace('\r\n', '\n')
        main, *rest = text.split('\n\n')
        entries = {}
        for block in rest:
            if not block.strip():
                continue
            d = {}
            for line in block.split('\n'):
                if ': ' in line:
                    k, v = line.split(': ', 1)
                    d[k] = v
            entries[d.get('Name')] = d
        return main, entries

    mf_main, mf_entries = parse_sections(mf)
    for name, d in mf_entries.items():
        data = zf.read(name)
        got = __import__('base64').b64encode(hashlib.sha256(data).digest()).decode()
        if got != d['SHA-256-Digest']:
            fail(f'MANIFEST.MF entry digest mismatch: {name}')
    print('MANIFEST.MF per-entry digests: OK' if mf_entries else 'MANIFEST.MF had no entries (BAD)')
    if not mf_entries:
        fail('empty MANIFEST.MF')

    sf_main, sf_entries = parse_sections(sf)
    sf_flat = sf.decode('utf-8')
    if 'X-Android-APK-Signed: 2' not in sf_flat:
        fail('missing X-Android-APK-Signed: 2 attribute')
    # whole-manifest digest
    import base64
    expect = base64.b64encode(hashlib.sha256(mf).digest()).decode()
    m = None
    for line in sf_flat.split('\r\n'):
        if line.startswith('SHA-256-Digest-Manifest: '):
            m = line.split(': ', 1)[1]
    if m != expect:
        fail(' CERT.SF whole-manifest digest mismatch')
    print('CERT.SF whole-manifest digest + X-Android-APK-Signed: OK')
    # per-entry SF digests (digest of manifest section blocks)
    def manifest_blocks(mf_bytes):
        blocks = {}
        cur = None
        buf = bytearray()
        for line in mf_bytes.split(b'\r\n'):
            if line.startswith(b'Name: '):
                if cur is not None:
                    blocks[cur] = bytes(buf)
                cur = line[6:].decode()
                buf = bytearray()
            if cur is not None:
                buf += line + b'\r\n'
        if cur is not None:
            blocks[cur] = bytes(buf)
        return blocks

    blocks = manifest_blocks(mf)
    for name, d in sf_entries.items():
        got = base64.b64encode(hashlib.sha256(blocks[name]).digest()).decode()
        if got != d['SHA-256-Digest']:
            fail(f'CERT.SF entry digest mismatch: {name}')
    print('CERT.SF per-entry digests: OK')

    # verify RSA signature over CERT.SF using cert from CERT.RSA
    ci = asn1cms.ContentInfo.load(rsa)
    sd = ci['content']
    certs_cms = sd['certificates']
    cert_entry = certs_cms[0].chosen
    signer_info = sd['signer_infos'][0]
    sf_signature = signer_info['signature'].native
    asn1_cert = asn1_x509.Certificate.load(cert_entry.dump())
    from cryptography.x509 import load_der_x509_certificate
    pycert = load_der_x509_certificate(cert_entry.dump())
    pycert.public_key().verify(sf_signature, sf, padding.PKCS1v15(), hashes.SHA256())
    print('CERT.SF signature: OK (', pycert.subject.rfc4514_string(), ')')

    # ---- alignment check for STORED entries
    data = Path(path).read_bytes()
    pos = 0
    align_fail = []
    while pos < len(data) - 4:
        (sig,) = struct.unpack_from('<I', data, pos)
        if sig != 0x04034b50:
            break
        (sig, vneed, flag, method, mtime, mdate, crc, csize, usize, nlen, elen) = \
            struct.unpack_from('<IHHHHHIIIHH', data, pos)
        data_off = pos + 30 + nlen + elen
        if data_off % 4:
            align_fail.append((data[pos + 30:pos + 30 + nlen].decode(), data_off))
        pos = data_off + csize
    if align_fail:
        fail(f'unaligned entries: {align_fail}')
    print('entry data alignment (4-byte): OK')

    print()
    print('ALL CHECKS PASSED —', path)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/home/user/Chessi/android/.build/chessi-1.0.0.apk')
