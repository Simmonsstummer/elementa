"""Estrae proprietà, configurazioni e isotopi dal database della libreria mendeleev (MIT)."""
import sqlite3, json, re
import os, mendeleev
DB = os.path.join(os.path.dirname(mendeleev.__file__), 'elements.db')
OUT = os.path.join(os.path.dirname(__file__), 'data.json')
c = sqlite3.connect(DB); c.row_factory = sqlite3.Row

UNIT = {'ysec':1e-24,'zsec':1e-21,'asec':1e-18,'psec':1e-12,'nsec':1e-9,'usec':1e-6,'msec':1e-3,'sec':1,
        'minute':60,'hour':3600,'day':86400,'year':3.15576e7}
for p,f in [('k',1e3),('M',1e6),('G',1e9),('T',1e12),('P',1e15),('E',1e18),('Z',1e21),('Y',1e24)]:
    UNIT[p+'year'] = 3.15576e7*f

def r(x, n=4):
    if x is None: return None
    if isinstance(x, float):
        if x == 0: return 0
        from math import log10, floor
        return float(f'{x:.{n}g}')
    return x

phase = {}
pref = {15:'white',50:'white',34:'gray',16:'rhombic',33:'gray',6:'graphite'}
for row in c.execute('select * from phasetransitions order by id'):
    z = row['atomic_number']
    if z in phase:
        if pref.get(z) and row['allotrope'] == pref[z]:
            phase[z] = row
        continue
    phase[z] = row

ie = {row['atomic_number']: row['ionization_energy'] for row in c.execute('select * from ionizationenergies where ion_charge=0')}
ox = {}
for row in c.execute('select * from oxidationstates'):
    ox.setdefault(row['atomic_number'], {'m':[], 'e':[]})['m' if row['category']=='main' else 'e'].append(row['oxidation_state'])

decay = {}
for row in c.execute('select * from isotopedecaymodes order by id'):
    decay.setdefault(row['isotope_id'], []).append([row['mode'], (row['relation'] or '').strip(), row['intensity']])

isos = {}
for row in c.execute('select * from isotopes order by atomic_number, mass_number'):
    z = row['atomic_number']
    modes = decay.get(row['id'], [])
    stable = (row['is_radioactive'] == 0 and row['abundance'] is not None)
    hl = None
    if row['half_life'] is not None and row['half_life_unit']:
        hl = row['half_life'] * UNIT[row['half_life_unit']]
    # decay mode intensities: trust only if they sum sensibly
    tot = sum(m[2] for m in modes if m[2] is not None)
    dm = []
    for i, (m, rel, inten) in enumerate(modes):
        if inten is not None and (tot <= 100.6 or i == 0):
            dm.append([m, r(inten, 4)])
        else:
            dm.append([m, None])
    sp = (row['spin'] or '') + (row['parity'] or '')
    isos.setdefault(z, []).append([row['mass_number'], r(row['mass'], 9), r(row['abundance'], 5),
                                   1 if stable else 0, r(hl, 4), dm, sp, row['discovery_year']])

out = []
for e in c.execute('select * from elements order by atomic_number'):
    z = e['atomic_number']
    ph = phase.get(z)
    mp = ph['melting_point'] if ph else None
    bp = ph['boiling_point'] if ph else None
    sub = bool(ph and ph['is_sublimation_point'])
    out.append({
        'z': z, 's': e['symbol'], 'en': e['name'], 'm': r(e['atomic_weight'], 7), 'g': e['group_id'], 'p': e['period'],
        'b': e['block'], 'sr': e['series_id'], 'ec': e['electronic_configuration'],
        'rho': r(e['density']), 'mp': r(mp, 5), 'bp': r(bp, 5), 'sub': sub,
        'enp': r(e['en_pauling'], 3), 'ar': r(e['atomic_radius']) or r(e['atomic_radius_rahm']),
        'cr': r(e['covalent_radius_pyykko']), 'vdw': r(e['vdw_radius']), 'ie': r(ie.get(z), 5), 'ea': r(e['electron_affinity'], 4),
        'ox': ox.get(z, {'m':[], 'e':[]}), 'lat': e['lattice_structure'], 'crust': r(e['abundance_crust']), 'sea': r(e['abundance_sea']),
        'prod': e['top_3_producers'], 'price': r(e['price_per_kg']), 'rad': bool(e['is_radioactive']),
        'cpk': e['cpk_color'], 'yr': e['discovery_year'], 'who': e['discoverers'], 'loc': e['discovery_location'],
        'tc': r(e['thermal_conductivity']), 'cp': r(e['specific_heat_capacity']), 'geo': e['goldschmidt_class'],
        'iso': isos.get(z, []),
    })

json.dump(out, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
print('dati mendeleev:', len(out), 'elementi')
