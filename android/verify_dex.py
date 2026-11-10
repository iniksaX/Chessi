import sys
from androguard.core.dex import DEX

def analyze(path):
    with open(path, 'rb') as f:
        d = DEX(f.read())
    classes = list(d.get_classes())
    print('classes:', [c.get_name() for c in classes])
    for c in classes:
        for m in c.get_methods():
            ci = m.get_code()
            print(f'method {m.get_name()} registers={ci.get_registers_size()} ins={ci.get_ins_size()} insns={ci.get_insns_size()}')
            for ins in m.get_instructions():
                print('   ', ins.get_name(), ins.get_output())
    # also structural checks
    print('string_ids:', d.get_ids_length() if hasattr(d, 'get_ids_length') else 'n/a')
    print('androguard parsed OK')

analyze(sys.argv[1])
