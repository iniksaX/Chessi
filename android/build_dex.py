#!/usr/bin/env python3
"""Hand-rolled DEX (v039) generator for the Chessi WebView host activity.

No Java toolchain exists in this offline environment, so bytecode is emitted
directly. Classes:

  com.chessi.app.MainActivity  - Activity hosting the WebView; overrides
                                 onActivityResult to hand results to ChromeClient.
  com.chessi.app.ChromeClient  - WebChromeClient subclass handling
                                 onShowFileChooser so <input type="file">
                                 (gallery avatar upload) works.

Verified with androguard (see verify_dex.py).
"""

import hashlib
import struct
import sys
import zlib

NO_INDEX = 0xFFFFFFFF
NO_OFFSET = 0
ACC_PUBLIC = 0x1
ACC_PROTECTED = 0x4
ACC_STATIC = 0x8
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
S_CHROME = 'Lcom/chessi/app/ChromeClient;'
S_ACT = 'Landroid/app/Activity;'
S_BUNDLE = 'Landroid/os/Bundle;'
S_CONTEXT = 'Landroid/content/Context;'
S_INTENT = 'Landroid/content/Intent;'
S_WEBVIEW = 'Landroid/webkit/WebView;'
S_WEBSETTINGS = 'Landroid/webkit/WebSettings;'
S_WCC = 'Landroid/webkit/WebChromeClient;'
S_PARAMS = 'Landroid/webkit/WebChromeClient$FileChooserParams;'
S_VCB = 'Landroid/webkit/ValueCallback;'
S_URIARR = '[Landroid/net/Uri;'
S_VIEW = 'Landroid/view/View;'
S_JSTRING = 'Ljava/lang/String;'
S_OBJ = 'Ljava/lang/Object;'
S_INT = 'I'
S_VOID = 'V'
S_BOOLEAN = 'Z'
S_URL = 'file:///android_asset/index.html'
S_SOURCE = 'MainActivity.java'
S_SOURCE2 = 'ChromeClient.java'
S_GETSETTINGS = 'getSettings'
S_SETJS = 'setJavaScriptEnabled'
S_SETDOM = 'setDomStorageEnabled'
S_LOADURL = 'loadUrl'
S_SETCONTENT = 'setContentView'
S_SETWCC = 'setWebChromeClient'
S_GETCONTEXT = 'getContext'
S_SAFR = 'startActivityForResult'
S_ONACTRES = 'onActivityResult'
S_ONSHOW = 'onShowFileChooser'
S_CREATEINTENT = 'createIntent'
S_PARSE = 'parseResult'
S_ONRECEIVE = 'onReceiveValue'
S_DELIVER = 'deliverResult'
S_FIELD = 'sCallback'
S_INIT = '<init>'
S_ONCREATE = 'onCreate'
S_SHORTY_V = 'V'
S_SHORTY_L = 'L'
S_SHORTY_VL = 'VL'
S_SHORTY_ZV = 'ZV'
S_SHORTY_LV = 'LV'
S_SHORTY_ILV = 'ILV'
S_SHORTY_LIV = 'LIV'
S_SHORTY_IILV = 'IILV'
S_SHORTY_LLLZ = 'LLLZ'
S_SHORTY_ILARR = 'IL['

STRINGS = [
    S_MAIN, S_CHROME, S_ACT, S_BUNDLE, S_CONTEXT, S_INTENT, S_WEBVIEW,
    S_WEBSETTINGS, S_WCC, S_PARAMS, S_VCB, S_URIARR, S_VIEW, S_JSTRING,
    S_OBJ, S_INT, S_VOID, S_BOOLEAN, S_URL, S_SOURCE, S_SOURCE2,
    S_GETSETTINGS, S_SETJS, S_SETDOM, S_LOADURL, S_SETCONTENT, S_SETWCC,
    S_GETCONTEXT, S_SAFR, S_ONACTRES, S_ONSHOW, S_CREATEINTENT, S_PARSE,
    S_ONRECEIVE, S_DELIVER, S_FIELD, S_INIT, S_ONCREATE,
    S_SHORTY_V, S_SHORTY_L, S_SHORTY_VL, S_SHORTY_ZV, S_SHORTY_LV,
    S_SHORTY_ILV, S_SHORTY_LIV, S_SHORTY_IILV, S_SHORTY_LLLZ, S_SHORTY_ILARR,
]

TYPES = [
    S_VOID, S_BOOLEAN, S_INT,
    S_MAIN, S_CHROME, S_ACT, S_BUNDLE, S_CONTEXT, S_INTENT, S_WEBVIEW,
    S_WEBSETTINGS, S_WCC, S_PARAMS, S_VCB, S_URIARR, S_VIEW, S_JSTRING, S_OBJ,
]

P_INIT = (S_SHORTY_V, S_VOID, ())
P_ONCREATE = (S_SHORTY_VL, S_VOID, (S_BUNDLE,))
P_WEBVIEW_INIT = (S_SHORTY_VL, S_VOID, (S_CONTEXT,))
P_GETSETTINGS = (S_SHORTY_L, S_WEBSETTINGS, ())
P_SETZ = (S_SHORTY_ZV, S_VOID, (S_BOOLEAN,))
P_LOADURL = (S_SHORTY_VL, S_VOID, (S_JSTRING,))
P_SETCONTENT = (S_SHORTY_VL, S_VOID, (S_VIEW,))
P_SETWCC = (S_SHORTY_LV, S_VOID, (S_WCC,))
P_ONACTRES = (S_SHORTY_IILV, S_VOID, (S_INT, S_INT, S_INTENT))
P_SAFR = (S_SHORTY_LIV, S_VOID, (S_INTENT, S_INT))
P_ONSHOW = (S_SHORTY_LLLZ, S_BOOLEAN, (S_WEBVIEW, S_VCB, S_PARAMS))
P_CREATEINTENT = (S_SHORTY_L, S_INTENT, ())
P_PARSE = (S_SHORTY_ILARR, S_URIARR, (S_INT, S_INTENT))
P_ONRECEIVE = (S_SHORTY_LV, S_VOID, (S_OBJ,))
P_DELIVER = (S_SHORTY_ILV, S_VOID, (S_INT, S_INTENT))
P_GETCONTEXT = (S_SHORTY_L, S_CONTEXT, ())

PROTOS = [
    P_INIT, P_ONCREATE, P_WEBVIEW_INIT, P_GETSETTINGS, P_SETZ, P_LOADURL,
    P_SETCONTENT, P_SETWCC, P_ONACTRES, P_SAFR, P_ONSHOW, P_CREATEINTENT,
    P_PARSE, P_ONRECEIVE, P_DELIVER, P_GETCONTEXT,
]

METHODS = [
    (S_ACT, S_INIT, P_INIT),
    (S_WCC, S_INIT, P_INIT),
    (S_WEBVIEW, S_INIT, P_WEBVIEW_INIT),
    (S_ACT, S_ONCREATE, P_ONCREATE),
    (S_ACT, S_ONACTRES, P_ONACTRES),
    (S_ACT, S_SAFR, P_SAFR),
    (S_WEBVIEW, S_GETSETTINGS, P_GETSETTINGS),
    (S_WEBSETTINGS, S_SETJS, P_SETZ),
    (S_WEBSETTINGS, S_SETDOM, P_SETZ),
    (S_WEBVIEW, S_LOADURL, P_LOADURL),
    (S_ACT, S_SETCONTENT, P_SETCONTENT),
    (S_WEBVIEW, S_SETWCC, P_SETWCC),
    (S_VIEW, S_GETCONTEXT, P_GETCONTEXT),
    (S_CHROME, S_INIT, P_INIT),
    (S_CHROME, S_DELIVER, P_DELIVER),
    (S_CHROME, S_ONSHOW, P_ONSHOW),
    (S_PARAMS, S_CREATEINTENT, P_CREATEINTENT),
    (S_PARAMS, S_PARSE, P_PARSE),
    (S_VCB, S_ONRECEIVE, P_ONRECEIVE),
]

FIELDS = [
    (S_CHROME, S_FIELD, S_VCB),
]


def build():
    strings = sorted(set(STRINGS), key=lambda s: s.encode('utf-16-le'))
    str_idx = {s: i for i, s in enumerate(strings)}

    types = sorted(set(TYPES), key=lambda d: str_idx[d])
    type_idx = {d: i for i, d in enumerate(types)}

    protos = sorted(set(PROTOS), key=lambda p: (type_idx[p[1]], tuple(type_idx[a] for a in p[2])))
    proto_index = {p: i for i, p in enumerate(protos)}

    fields = sorted(set(FIELDS), key=lambda f: (type_idx[f[0]], str_idx[f[1]], type_idx[f[2]]))
    field_index = {f: i for i, f in enumerate(fields)}

    methods = sorted(set(METHODS), key=lambda m: (type_idx[m[0]], str_idx[m[1]], proto_index[m[2]]))
    method_index = {m: i for i, m in enumerate(methods)}

    def fidx(cls, name, ftype):
        return field_index[(cls, name, ftype)]

    def midx(cls, name, proto_key):
        return method_index[(cls, name, proto_key)]

    f_callback = fidx(S_CHROME, S_FIELD, S_VCB)

    m_act_init = midx(S_ACT, S_INIT, P_INIT)
    m_wcc_init = midx(S_WCC, S_INIT, P_INIT)
    m_chrome_init = midx(S_CHROME, S_INIT, P_INIT)
    m_deliver = midx(S_CHROME, S_DELIVER, P_DELIVER)
    m_onshow = midx(S_CHROME, S_ONSHOW, P_ONSHOW)
    m_act_oncreate = midx(S_ACT, S_ONCREATE, P_ONCREATE)
    m_act_onactres = midx(S_ACT, S_ONACTRES, P_ONACTRES)
    m_safr = midx(S_ACT, S_SAFR, P_SAFR)
    m_webview_init = midx(S_WEBVIEW, S_INIT, P_WEBVIEW_INIT)
    m_getsettings = midx(S_WEBVIEW, S_GETSETTINGS, P_GETSETTINGS)
    m_setjs = midx(S_WEBSETTINGS, S_SETJS, P_SETZ)
    m_setdom = midx(S_WEBSETTINGS, S_SETDOM, P_SETZ)
    m_loadurl = midx(S_WEBVIEW, S_LOADURL, P_LOADURL)
    m_setcontent = midx(S_ACT, S_SETCONTENT, P_SETCONTENT)
    m_setwcc = midx(S_WEBVIEW, S_SETWCC, P_SETWCC)
    m_getcontext = midx(S_VIEW, S_GETCONTEXT, P_GETCONTEXT)
    m_createintent = midx(S_PARAMS, S_CREATEINTENT, P_CREATEINTENT)
    m_parse = midx(S_PARAMS, S_PARSE, P_PARSE)
    m_onreceive = midx(S_VCB, S_ONRECEIVE, P_ONRECEIVE)

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

    def const16(reg, lit):
        return struct.pack('<BBH', 0x13, reg, lit & 0xFFFF)

    def const_string(reg, sidx):
        if sidx <= 0xFFFF:
            return struct.pack('<BBH', 0x1A, reg, sidx)
        return struct.pack('<BBI', 0x1B, reg, sidx)

    def field_21c(opcode, reg, field_id):
        return struct.pack('<BBH', opcode, reg, field_id)

    def if_22t(opcode, reg_a, reg_b, offset_units):
        b1 = ((reg_b & 0xF) << 4) | (reg_a & 0xF)
        return bytes([opcode, b1]) + struct.pack('<h', offset_units)

    def ifz_21t(opcode, reg, offset_units):
        return struct.pack('<BBh', opcode, reg, offset_units)

    def goto_10t(offset_units):
        return struct.pack('<Bb', 0x28, offset_units)

    def return_(reg):
        return bytes([0x0F, reg])

    def return_void():
        return bytes([0x0E, 0x00])

    INVOKE_VIRTUAL, INVOKE_SUPER, INVOKE_DIRECT, INVOKE_STATIC = 0x6E, 0x6F, 0x70, 0x71
    SGET_OBJECT, SPUT_OBJECT = 0x62, 0x69
    IF_NE, IF_EQZ = 0x33, 0x38

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
        + new_instance(1, type_idx[S_CHROME])
        + invoke(INVOKE_DIRECT, [1], m_chrome_init)
        + invoke(INVOKE_VIRTUAL, [0, 1], m_setwcc)
        + const_string(1, str_idx[S_URL])
        + invoke(INVOKE_VIRTUAL, [0, 1], m_loadurl)
        + invoke(INVOKE_VIRTUAL, [3, 0], m_setcontent)
        + return_void()
    )

    onactres_bytes = (
        invoke(INVOKE_SUPER, [1, 2, 3, 4], m_act_onactres)
        + invoke(INVOKE_STATIC, [3, 4], m_deliver)
        + return_void()
    )

    chrome_init_bytes = invoke(INVOKE_DIRECT, [0], m_wcc_init) + return_void()

    # ChromeClient.deliverResult(int resultCode /*v2*/, Intent intent /*v3*/):
    #   Uri[] r = (resultCode == RESULT_OK) ? FileChooserParams.parseResult(resultCode, intent) : null;
    #   ValueCallback cb = sCallback; sCallback = null;
    #   if (cb != null) cb.onReceiveValue(r);
    deliver_bytes = (
        field_21c(SGET_OBJECT, 0, f_callback)      # u0:  v0 = callback
        + const4(1, 0)                              # u2:  v1 = null
        + field_21c(SPUT_OBJECT, 1, f_callback)     # u3:  sCallback = null
        + ifz_21t(IF_EQZ, 0, 14)                    # u5:  if (v0 == null) goto end (u19)
        + const4(1, -1)                             # u7:  v1 = RESULT_OK (-1)
        + if_22t(IF_NE, 2, 1, 7)                    # u8:  if (resultCode != -1) goto nullres (u15)
        + invoke(INVOKE_STATIC, [2, 3], m_parse)    # u10: parseResult(resultCode, intent)
        + move_result_object(1)                     # u13: v1 = uris
        + goto_10t(2)                               # u14: goto deliver (u16)
        + const4(1, 0)                              # u15: v1 = null
        + invoke(INVOKE_VIRTUAL, [0, 1], m_onreceive)  # u16: callback.onReceiveValue(v1)
        + return_void()                             # u19: end
    )

    onshow_bytes = (
        field_21c(SPUT_OBJECT, 4, f_callback)       # sCallback = callback
        + invoke(INVOKE_VIRTUAL, [5], m_createintent)  # intent = params.createIntent()
        + move_result_object(0)                     # v0 = intent
        + invoke(INVOKE_VIRTUAL, [3], m_getcontext)    # ctx = webView.getContext()
        + move_result_object(1)                     # v1 = ctx
        + struct.pack('<BBH', 0x1F, 1, type_idx[S_ACT])  # check-cast v1, Activity
        + const16(2, 1001)                          # v2 = REQUEST_CODE (0x3E9)
        + invoke(INVOKE_VIRTUAL, [1, 0, 2], m_safr)      # activity.startActivityForResult(intent, 1001)
        + const4(0, 1)                              # v0 = true
        + return_(0)                                # return true
    )

    code_items = {
        m_act_init: code_item(1, 1, 1, init_bytes),
        m_act_oncreate: code_item(5, 2, 2, oncreate_bytes),
        m_act_onactres: code_item(5, 4, 4, onactres_bytes),
        m_chrome_init: code_item(1, 1, 1, chrome_init_bytes),
        m_deliver: code_item(4, 2, 2, deliver_bytes),
        m_onshow: code_item(6, 3, 3, onshow_bytes),
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
    field_ids_off = reserve(len(fields), 8)
    method_ids_off = reserve(len(methods), 8)
    class_defs_off = reserve(2, 32)

    MAP_LIST_TYPE = 0x1000
    items = [(0x0000, 1, 0x70)]  # header; rest appended later

    # map_list offset (4-aligned after class defs)
    off += (-off) % 4
    map_off = off
    map_item_count = 12
    # items: HEADER, STRING_ID, TYPE_ID, PROTO_ID, FIELD_ID, METHOD_ID, CLASS_DEF,
    #       [TYPE_LIST], CLASS_DATA_ITEM(x2), CODE_ITEM, STRING_DATA_ITEM, MAP_LIST
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

    # class definitions: (class_type, super_type, source, static_fields, instance_fields,
    #                     direct_methods, virtual_methods)
    CLASS_DEFS = [
        (S_MAIN, S_ACT, S_SOURCE,
         [],
         [],
         [(m_act_init, ACC_PUBLIC | ACC_CONSTRUCTOR)],
         [(m_act_oncreate, ACC_PROTECTED), (m_act_onactres, ACC_PROTECTED)]),
        (S_CHROME, S_WCC, S_SOURCE2,
         [(f_callback, ACC_PUBLIC | ACC_STATIC)],
         [],
         [(m_chrome_init, ACC_PUBLIC | ACC_CONSTRUCTOR), (m_deliver, ACC_PUBLIC | ACC_STATIC)],
         [(m_onshow, ACC_PUBLIC)]),
    ]

    def class_data_bytes(static_fields, instance_fields, direct, virtual, code_offs):
        static_fields = sorted(static_fields, key=lambda x: x[0])
        instance_fields = sorted(instance_fields, key=lambda x: x[0])
        direct = sorted(direct, key=lambda x: x[0])
        virtual = sorted(virtual, key=lambda x: x[0])
        out = bytearray()
        out += uleb128(len(static_fields))
        out += uleb128(len(instance_fields))
        out += uleb128(len(direct))
        out += uleb128(len(virtual))

        def diff_fields(flds):
            nonlocal_prev = 0
            for fidx_, flags in flds:
                out.extend(uleb128(fidx_ - nonlocal_prev))
                nonlocal_prev = fidx_
                out.extend(uleb128(flags))

        diff_fields(static_fields)
        diff_fields(instance_fields)

        prev = 0
        for midx_, flags in direct:
            out += uleb128(midx_ - prev)
            prev = midx_
            out += uleb128(flags)
            out += uleb128(code_offs[midx_])
        prev = 0
        for midx_, flags in virtual:
            out += uleb128(midx_ - prev)
            prev = midx_
            out += uleb128(flags)
            out += uleb128(code_offs[midx_])
        return bytes(out)

    # class_data items are laid out contiguously (the DEX reader walks the
    # map entry sequentially without re-aligning); code items are 4-aligned.
    def layout(code_offs):
        cds = []
        o = class_data_off
        for (ctype, super_type, source, sf, inf, direct, virtual) in CLASS_DEFS:
            cd = class_data_bytes(sf, inf, direct, virtual, code_offs)
            cds.append((o, cd, [m for m, _ in direct] + [m for m, _ in virtual]))
            o += len(cd)
        cur = o
        new_offs = {}
        for (cd_off, cd, mlist) in cds:
            for m in mlist:
                cur += (-cur) % 4
                new_offs[m] = cur
                cur += len(code_items[m])
        return cds, new_offs, cur

    code_offs = {m: class_data_off + 128 * (i + 1) for i, m in enumerate(code_items)}
    for _ in range(6):
        cds, new_offs, end_off = layout(code_offs)
        if all(new_offs[k] == code_offs.get(k) for k in code_items):
            code_offs = new_offs
            break
        code_offs = new_offs
    cds, new_offs, end_off = layout(code_offs)
    code_offs = new_offs
    file_size = end_off
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
    # field ids: class u16, type u16, name u32
    for i, (cls, name, ftype) in enumerate(fields):
        struct.pack_into('<HHI', out, field_ids_off + 8 * i,
                         type_idx[cls], type_idx[ftype], str_idx[name])
    # method ids: class u16, proto u16, name u32
    for i, (cls, name, pk) in enumerate(methods):
        struct.pack_into('<HHI', out, method_ids_off + 8 * i,
                         type_idx[cls], proto_index[pk], str_idx[name])
    # class defs
    ACC_SUPER = 0x20
    for ci, (ctype, super_type, source, sf, inf, direct, virtual) in enumerate(CLASS_DEFS):
        struct.pack_into('<IIIIIIII', out, class_defs_off + 32 * ci,
                         type_idx[ctype], ACC_PUBLIC | ACC_SUPER, type_idx[super_type],
                         NO_OFFSET, str_idx[source], 0, cds[ci][0], 0)
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
    for cd_off, cd, _ in cds:
        out[cd_off:cd_off + len(cd)] = cd
    # code items
    for midx, blob in code_items.items():
        o = code_offs[midx]
        out[o:o + len(blob)] = blob
    # map list
    MAP_HEADER = 0x0000
    MAP_STRING_ID = 0x0001
    MAP_TYPE_ID = 0x0002
    MAP_PROTO_ID = 0x0003
    MAP_FIELD_ID = 0x0004
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
        (MAP_FIELD_ID, len(fields), field_ids_off),
        (MAP_METHOD_ID, len(methods), method_ids_off),
        (MAP_CLASS_DEF, len(CLASS_DEFS), class_defs_off),
        (MAP_TYPE_LIST, type_list_structs, min(type_list_offsets.values())),
        (MAP_STRING_DATA, len(strings), min(string_data_offsets)),
        (MAP_CLASS_DATA, len(cds), min(cd[0] for cd in cds)),
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
    struct.pack_into('<I', out, 80, len(fields))
    struct.pack_into('<I', out, 84, field_ids_off)
    struct.pack_into('<I', out, 88, len(methods))
    struct.pack_into('<I', out, 92, method_ids_off)
    struct.pack_into('<I', out, 96, len(CLASS_DEFS))
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
