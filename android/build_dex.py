#!/usr/bin/env python3
"""Hand-rolled DEX (v039) generator for the Chessi WebView host activity.

No Java toolchain exists in this offline environment, so bytecode is emitted
directly. Verified with androguard (see verify_dex.py).
"""

import hashlib
import struct
import sys
import zlib

NO_INDEX = 0xFFFFFFFF
NO_OFFSET = 0
ACC_PUBLIC = 0x1
ACC_PROTECTED = 0x4
ACC_CONSTRUCTOR = 0x10000


def uleb128(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def utf16_units(s):
    return len(s.encode('utf-16-le')) // 2


def raw(s):
    return s.encode('utf-8')


S_MAIN = 'Lcom/chessi/app/MainActivity;'
S_ACT = 'Landroid/app/Activity;'
S_BUNDLE = 'Landroid/os/Bundle;'
S_CONTEXT = 'Landroid/content/Context;'
S_WEBVIEW = 'Landroid/webkit/WebView;'
S_WEBSETTINGS = 'Landroid/webkit/WebSettings;'
S_VIEW = 'Landroid/view/View;'
S_JSTRING = 'Ljava/lang/String;'
S_VOID = 'V'
S_BOOLEAN = 'Z'
S_URL = 'file:///android_asset/index.html'
S_SOURCE = 'MainActivity.java'
S_GETSETTINGS = 'getSettings'
S_SETJS = 'setJavaScriptEnabled'
S_SETDOM = 'setDomStorageEnabled'
S_LOADURL = 'loadUrl'
S_SETCONTENT = 'setContentView'
S_INIT = '<init>'
S_ONCREATE = 'onCreate'
S_SHORTY_V = 'V'
S_SHORTY_L = 'L'
S_SHORTY_VL = 'VL'
S_SHORTY_ZV = 'ZV'

STRINGS = [
    S_MAIN, S_ACT, S_BUNDLE, S_CONTEXT, S_WEBVIEW, S_WEBSETTINGS, S_VIEW,
    S_JSTRING, S_VOID, S_BOOLEAN, S_URL, S_SOURCE,
    S_GETSETTINGS, S_SETJS, S_SETDOM, S_LOADURL, S_SETCONTENT, S_INIT, S_ONCREATE,
    S_SHORTY_V, S_SHORTY_L, S_SHORTY_VL, S_SHORTY_ZV,
]

TYPES = [S_VOID, S_BOOLEAN, S_MAIN, S_ACT, S_BUNDLE, S_CONTEXT, S_WEBVIEW, S_WEBSETTINGS, S_VIEW, S_JSTRING]

P_INIT = (S_SHORTY_V, S_VOID, ())
P_ONCREATE = (S_SHORTY_VL, S_VOID, (S_BUNDLE,))
P_WEBVIEW_INIT = (S_SHORTY_VL, S_VOID, (S_CONTEXT,))
P_GETSETTINGS = (S_SHORTY_L, S_WEBSETTINGS, ())
P_SETZ = (S_SHORTY_ZV, S_VOID, (S_BOOLEAN,))
P_LOADURL = (S_SHORTY_VL, S_VOID, (S_JSTRING,))
P_SETCONTENT = (S_SHORTY_VL, S_VOID, (S_VIEW,))

PROTOS = [P_INIT, P_ONCREATE, P_WEBVIEW_INIT, P_GETSETTINGS, P_SETZ, P_LOADURL, P_SETCONTENT]

METHODS = [
    (S_ACT, S_INIT, P_INIT),
    (S_ACT, S_ONCREATE, P_ONCREATE),
    (S_WEBVIEW, S_INIT, P_WEBVIEW_INIT),
    (S_WEBVIEW, S_GETSETTINGS, P_GETSETTINGS),
    (S_WEBSETTINGS, S_SETJS, P_SETZ),
    (S_WEBSETTINGS, S_SETDOM, P_SETZ),
    (S_WEBVIEW, S_LOADURL, P_LOADURL),
    (S_ACT, S_SETCONTENT, P_SETCONTENT),
]


def build():
    strings = sorted(set(STRINGS), key=lambda s: s.encode('utf-16-le'))
    str_idx = {s: i for i, s in enumerate(strings)}

    types = sorted(set(TYPES), key=lambda d: str_idx[d])
    type_idx = {d: i for i, d in enumerate(types)}

    protos = sorted(set(PROTOS), key=lambda p: (type_idx[p[1]], tuple(type_idx[a] for a in p[2])))
    proto_index = {p: i for i, p in enumerate(protos)}

    methods = sorted(set(METHODS), key=lambda m: (type_idx[m[0]], str_idx[m[1]], proto_index[m[2]]))
    method_index = {m: i for i, m in enumerate(methods)}

    def midx(cls, name, proto_key):
        return method_index[(cls, name, proto_key)]

    m_act_init = midx(S_ACT, S_INIT, P_INIT)
    m_act_oncreate = midx(S_ACT, S_ONCREATE, P_ONCREATE)
    m_webview_init = midx(S_WEBVIEW, S_INIT, P_WEBVIEW_INIT)
    m_getsettings = midx(S_WEBVIEW, S_GETSETTINGS, P_GETSETTINGS)
    m_setjs = midx(S_WEBSETTINGS, S_SETJS, P_SETZ)
    m_setdom = midx(S_WEBSETTINGS, S_SETDOM, P_SETZ)
    m_loadurl = midx(S_WEBVIEW, S_LOADURL, P_LOADURL)
    m_setcontent = midx(S_ACT, S_SETCONTENT, P_SETCONTENT)

    # ---------- instruction encoders ----------
    def invoke(opcode, args, method_id):
        a = list(args) + [0] * (5 - len(args))
        b1 = (len(args) << 4) | a[4]
        regs = a[0] | (a[1] << 4) | (a[2] << 8) | (a[3] << 12)
        return struct.pack('<BBHH', opcode, b1, method_id, regs)

    def new_instance(reg, tidx):
        return struct.pack('<BBH', 0x22, reg, tidx)

    def move_result_object(reg):
        return bytes([0x0C, reg])

    def const4(reg, lit):
        return bytes([0x12, ((lit & 0xF) << 4) | reg])

    def const_string(reg, sidx):
        if sidx <= 0xFFFF:
            return struct.pack('<BBH', 0x1A, reg, sidx)
        return struct.pack('<BBI', 0x1B, reg, sidx)

    def return_void():
        return bytes([0x0E, 0x00])

    INVOKE_VIRTUAL, INVOKE_SUPER, INVOKE_DIRECT = 0x6E, 0x6F, 0x70

    def code_item(registers, ins_size, outs_size, insns):
        insns = bytes(insns)
        if len(insns) % 4:
            insns += bytes(4 - (len(insns) % 4))
        units = len(insns) // 2
        return struct.pack('<HHHHII', registers, ins_size, outs_size, 0, 0, units) + insns

    init_bytes = invoke(INVOKE_DIRECT, [0], m_act_init) + return_void()
    oncreate_bytes = (
        invoke(INVOKE_SUPER, [3, 4], m_act_oncreate)
        + new_instance(0, type_idx[S_WEBVIEW])
        + invoke(INVOKE_DIRECT, [0, 3], m_webview_init)
        + invoke(INVOKE_VIRTUAL, [0], m_getsettings)
        + move_result_object(1)
        + const4(2, 1)
        + invoke(INVOKE_VIRTUAL, [1, 2], m_setjs)
        + invoke(INVOKE_VIRTUAL, [1, 2], m_setdom)
        + const_string(1, str_idx[S_URL])
        + invoke(INVOKE_VIRTUAL, [0, 1], m_loadurl)
        + invoke(INVOKE_VIRTUAL, [3, 0], m_setcontent)
        + return_void()
    )

    code_items = {
        m_act_init: code_item(1, 1, 1, init_bytes),
        m_act_oncreate: code_item(5, 2, 2, oncreate_bytes),
    }

    # ---------- section layout ----------
    HEADER = 0x70
    off = HEADER

    def reserve(count, size, align=1):
        nonlocal off
        off += (-off) % align
        start = off
        off += count * size
        return start

    string_ids_off = reserve(len(strings), 4)
    type_ids_off = reserve(len(types), 4)
    proto_ids_off = reserve(len(protos), 12)
    method_ids_off = reserve(len(methods), 8)
    class_defs_off = reserve(1, 32)

    MAP_LIST_TYPE = 0x1000
    items = [(0x0000, 1, 0x70)]  # header; rest appended later

    # map_list offset (4-aligned after class defs)
    off += (-off) % 4
    map_off = off
    # we know the exact item count now:
    map_item_count = 10 if any(p[2] for p in protos) else 9
    # items: HEADER, STRING_ID, TYPE_ID, PROTO_ID, METHOD_ID, CLASS_DEF,
    #       [TYPE_LIST], CODE_ITEM, CLASS_DATA_ITEM, STRING_DATA_ITEM, MAP_LIST
    map_item_count = 11
    off = map_off + 4 + map_item_count * 12

    # type lists
    off += (-off) % 4
    type_lists_off = off
    type_list_offsets = {}
    type_list_structs = 0
    for pidx, p in enumerate(protos):
        if p[2]:
            off += (-off) % 4
            type_list_offsets[pidx] = off
            type_list_structs += 1
            off += 4 + 2 * len(p[2])

    # string data
    string_data_offsets = []
    for s in strings:
        string_data_offsets.append(off)
        off += len(uleb128(utf16_units(s))) + len(raw(s)) + 1

    off += (-off) % 4
    class_data_off = off

    direct = [(m_act_init, ACC_PUBLIC | ACC_CONSTRUCTOR)]
    virtual = [(m_act_oncreate, ACC_PROTECTED)]

    def class_data_bytes(code_offs):
        out = bytearray()
        out += uleb128(0)
        out += uleb128(0)
        out += uleb128(len(direct))
        out += uleb128(len(virtual))
        prev = 0
        for midx, flags in direct:
            out += uleb128(midx - prev)
            prev = midx
            out += uleb128(flags)
            out += uleb128(code_offs[midx])
        prev = 0
        for midx, flags in virtual:
            out += uleb128(midx - prev)
            prev = midx
            out += uleb128(flags)
            out += uleb128(code_offs[midx])
        return bytes(out)

    # code offsets depend on class_data size; iterate to fixpoint
    code_offs = {m_act_init: class_data_off + 64, m_act_oncreate: class_data_off + 64}
    for _ in range(4):
        cd = class_data_bytes(code_offs)
        o = class_data_off + len(cd)
        new_offs = {}
        for midx, _ in direct + virtual:
            o += (-o) % 4
            new_offs[midx] = o
            o += len(code_items[midx])
        if all(new_offs[k] == code_offs[k] for k in code_offs):
            code_offs = new_offs
            break
        code_offs = new_offs

    class_data = class_data_bytes(code_offs)
    file_size = max(code_offs[m] + len(code_items[m]) for m in code_items)
    data_off = map_off
    data_size = file_size - data_off
    assert data_size % 4 == 0, 'data_size must be a multiple of 4'

    out = bytearray(file_size)

    # string ids -> offsets of string_data
    for i, so in enumerate(string_data_offsets):
        struct.pack_into('<I', out, string_ids_off + 4 * i, so)
    # type ids
    for i, dsc in enumerate(types):
        struct.pack_into('<I', out, type_ids_off + 4 * i, str_idx[dsc])
    # proto ids
    for i, p in enumerate(protos):
        struct.pack_into('<III', out, proto_ids_off + 12 * i,
                         str_idx[p[0]], type_idx[p[1]], type_list_offsets.get(i, NO_OFFSET))
    # method ids: class u16, proto u16, name u32
    for i, (cls, name, pk) in enumerate(methods):
        struct.pack_into('<HHI', out, method_ids_off + 8 * i,
                         type_idx[cls], proto_index[pk], str_idx[name])
    # class def
    ACC_SUPER = 0x20
    struct.pack_into('<IIIIIIII', out, class_defs_off,
                     type_idx[S_MAIN], ACC_PUBLIC | ACC_SUPER, type_idx[S_ACT],
                     NO_OFFSET, str_idx[S_SOURCE], 0, class_data_off, 0)
    # type lists
    for pidx, p in enumerate(protos):
        if p[2]:
            o = type_list_offsets[pidx]
            struct.pack_into('<I', out, o, len(p[2]))
            o += 4
            for a in p[2]:
                struct.pack_into('<H', out, o, type_idx[a])
                o += 2
    # string data
    for s, so in zip(strings, string_data_offsets):
        seg = uleb128(utf16_units(s)) + raw(s) + b'\x00'
        out[so:so + len(seg)] = seg
    # class data
    out[class_data_off:class_data_off + len(class_data)] = class_data
    # code items
    for midx, blob in code_items.items():
        o = code_offs[midx]
        out[o:o + len(blob)] = blob
    # map list
    MAP_HEADER = 0x0000
    MAP_STRING_ID = 0x0001
    MAP_TYPE_ID = 0x0002
    MAP_PROTO_ID = 0x0003
    MAP_METHOD_ID = 0x0005
    MAP_CLASS_DEF = 0x0006
    MAP_TYPE_LIST = 0x1001
    MAP_CLASS_DATA = 0x2000
    MAP_CODE = 0x2001
    MAP_STRING_DATA = 0x2002
    MAP_LIST = 0x1000
    map_items = [
        (MAP_HEADER, 1, 0),
        (MAP_STRING_ID, len(strings), string_ids_off),
        (MAP_TYPE_ID, len(types), type_ids_off),
        (MAP_PROTO_ID, len(protos), proto_ids_off),
        (MAP_METHOD_ID, len(methods), method_ids_off),
        (MAP_CLASS_DEF, 1, class_defs_off),
        (MAP_TYPE_LIST, type_list_structs, min(type_list_offsets.values())),
        (MAP_STRING_DATA, len(strings), min(string_data_offsets)),
        (MAP_CLASS_DATA, 1, class_data_off),
        (MAP_CODE, len(code_items), min(code_offs.values())),
        (MAP_LIST, 1, map_off),
    ]
    map_items.sort(key=lambda it: it[2])  # dex requires offset order
    struct.pack_into('<I', out, map_off, len(map_items))
    p = map_off + 4
    for t, size, o in map_items:
        struct.pack_into('<HHII', out, p, t, 0, size, o)
        p += 12
    # header
    out[0:8] = b'dex\n039\x00'
    struct.pack_into('<I', out, 32, file_size)
    struct.pack_into('<I', out, 36, 0x70)
    struct.pack_into('<I', out, 40, 0x12345678)
    struct.pack_into('<I', out, 44, 0)
    struct.pack_into('<I', out, 48, 0)
    struct.pack_into('<I', out, 52, map_off)
    struct.pack_into('<I', out, 56, len(strings))
    struct.pack_into('<I', out, 60, string_ids_off)
    struct.pack_into('<I', out, 64, len(types))
    struct.pack_into('<I', out, 68, type_ids_off)
    struct.pack_into('<I', out, 72, len(protos))
    struct.pack_into('<I', out, 76, proto_ids_off)
    struct.pack_into('<I', out, 80, 0)
    struct.pack_into('<I', out, 84, 0)
    struct.pack_into('<I', out, 88, len(methods))
    struct.pack_into('<I', out, 92, method_ids_off)
    struct.pack_into('<I', out, 96, 1)
    struct.pack_into('<I', out, 100, class_defs_off)
    struct.pack_into('<I', out, 104, data_size)
    struct.pack_into('<I', out, 108, data_off)
    # signature & checksum
    out[12:32] = hashlib.sha1(bytes(out[32:])).digest()
    struct.pack_into('<I', out, 8, zlib.adler32(bytes(out[12:])))
    return bytes(out)


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'classes.dex'
    blob = build()
    with open(target, 'wb') as f:
        f.write(blob)
    print(f'wrote {target}: {len(blob)} bytes')
