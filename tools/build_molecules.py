"""Builds molecules.json from tools/molecole.py using RDKit (3D coordinates).
Genera molecules.json da tools/molecole.py con RDKit (coordinate 3D).

    pip install rdkit
    python tools/build_molecules.py
"""
import json, math, os, sys
from rdkit import Chem
from rdkit.Chem import AllChem

sys.path.insert(0, os.path.dirname(__file__))
from molecole import MOLECULES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VALENCE = {'H': [1], 'C': [4], 'N': [3], 'O': [2], 'S': [2, 4, 6], 'P': [3, 5],
           'F': [1], 'Cl': [1], 'Na': [1], 'K': [1], 'Ca': [2]}
# formula as people usually write it (otherwise the Hill formula)
COMMON = {'h2o': 'H2O', 'h2o2': 'H2O2', 'co2': 'CO2', 'h2co3': 'H2CO3', 'nh3': 'NH3', 'hcl': 'HCl',
          'hf': 'HF', 'h2s': 'H2S', 'ch3oh': 'CH3OH', 'ethanol': 'C2H5OH', 'hcooh': 'HCOOH',
          'acetic': 'CH3COOH', 'urea': 'CO(NH2)2', 'so2': 'SO2', 'h2so4': 'H2SO4', 'h3po4': 'H3PO4',
          'nacl': 'NaCl', 'kcl': 'KCl', 'naoh': 'NaOH', 'naclo': 'NaClO', 'nahco3': 'NaHCO3',
          'cacl2': 'CaCl2', 'cao': 'CaO', 'caco3': 'CaCO3', 'caoh2': 'Ca(OH)2', 'na2co3': 'Na2CO3'}
# Small molecules where the force field is unreliable: measured gas-phase geometry
# (bond lengths in Å, angles in degrees; NIST CCCBDB / CRC Handbook). Atom order = RDKit order.
# Piccole molecole dove il campo di forza non è affidabile: geometria sperimentale in fase gassosa.
def _di(d): return [(-d / 2, 0, 0), (d / 2, 0, 0)]
def _bent(r, ang, centre):  # X-A-X with A at index `centre`
    a = math.radians(ang) / 2
    xs = [(-r * math.sin(a), -r * math.cos(a), 0), (r * math.sin(a), -r * math.cos(a), 0)]
    xs.insert(centre, (0, 0, 0))
    return xs
def _lin(*ds):  # atoms on a line, distances between neighbours
    x, out = 0, [(0, 0, 0)]
    for d in ds: x += d; out.append((x, 0, 0))
    return out
MEASURED = {
    'h2': ('HH', _di(0.741)), 'o2': ('OO', _di(1.208)), 'n2': ('NN', _di(1.098)), 'cl2': ('ClCl', _di(1.988)),
    'f2': ('FF', _di(1.412)), 'hcl': ('ClH', _di(1.275)), 'hf': ('FH', _di(0.917)),
    'h2o': ('OHH', _bent(0.958, 104.48, 0)), 'h2s': ('SHH', _bent(1.336, 92.1, 0)),
    'co2': ('OCO', _lin(1.160, 1.160)), 'so2': ('OSO', _bent(1.431, 119.3, 1)),
    'nacl': ('NaCl', _di(2.361)), 'kcl': ('KCl', _di(2.667)), 'cao': ('CaO', _di(1.822)),
    'cacl2': ('ClCaCl', _lin(2.483, 2.483)), 'naoh': ('NaOH', _lin(1.950, 0.958)),
}
# Ionic compounds drawn as one unit: idealised geometry (planar carbonate at 120°, C–O 1.29 Å,
# typical metal–oxygen distances). Composti ionici disegnati come un'unità: geometria idealizzata.
_CO3 = {'up': (0, 1.29, 0), 'l': (-1.117, -0.645, 0), 'r': (1.117, -0.645, 0)}
IDEAL = {
    'caco3': ('OCOCaO', [_CO3['up'], (0, 0, 0), _CO3['l'], (0, -2.713, 0), _CO3['r']]),
    'caoh2': ('OCaOHH', [(-2.03, 0, 0), (0, 0, 0), (2.03, 0, 0), (-2.98, 0, 0), (2.98, 0, 0)]),
    'na2co3': ('NaOCOONa', [(-3.022, -1.745, 0), _CO3['l'], (0, 0, 0), _CO3['up'], _CO3['r'], (3.022, -1.745, 0)]),
}
SUB = str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉')


def hill(counts):
    keys = sorted(counts)
    if 'C' in counts:
        keys = ['C'] + (['H'] if 'H' in counts else []) + sorted(k for k in counts if k not in ('C', 'H'))
    return ''.join(k + (str(counts[k]) if counts[k] > 1 else '') for k in keys)


def build(mid, smi, kind):
    mol = Chem.MolFromSmiles(smi)
    assert mol is not None, mid
    mol = Chem.AddHs(mol)
    Chem.Kekulize(mol, clearAromaticFlags=True)
    # read the bonds now: the force field re-perceives aromaticity
    bonds = [[b.GetBeginAtomIdx(), b.GetEndAtomIdx(), int(b.GetBondTypeAsDouble())] for b in mol.GetBonds()]
    p = AllChem.ETKDGv3(); p.randomSeed = 7
    if AllChem.EmbedMolecule(mol, p) != 0:
        p.useRandomCoords = True
        assert AllChem.EmbedMolecule(mol, p) == 0, mid
    try:
        if AllChem.MMFFHasAllMoleculeParams(mol):
            AllChem.MMFFOptimizeMolecule(mol, maxIters=2000)
        else:
            AllChem.UFFOptimizeMolecule(mol, maxIters=2000)
    except Exception:
        pass
    conf = mol.GetConformer()
    pts = [tuple(conf.GetAtomPosition(i)) for i in range(mol.GetNumAtoms())]
    syms = [a.GetSymbol() for a in mol.GetAtoms()]
    if mid in MEASURED or mid in IDEAL:
        order, pts = MEASURED.get(mid) or IDEAL[mid]
        assert ''.join(syms) == order, (mid, syms)
    cx, cy, cz = (sum(q[k] for q in pts) / len(pts) for k in range(3))
    atoms, counts = [], {}
    for s, q in zip(syms, pts):
        counts[s] = counts.get(s, 0) + 1
        atoms.append([s, round(q[0] - cx, 3), round(q[1] - cy, 3), round(q[2] - cz, 3)])
    if kind in 'bi':  # every atom must obey the game's valence rules
        tot = [0] * len(atoms)
        for i, j, o in bonds:
            tot[i] += o; tot[j] += o
        for (s, *_), v in zip(atoms, tot):
            assert s in VALENCE and v in VALENCE[s], (mid, s, v)
    f = COMMON.get(mid, hill(counts))
    return {'atoms': atoms, 'bonds': bonds, 'f': f.translate(SUB)}


def main():
    out, seen = [], set()
    for mid, smi, kind, it, en in MOLECULES:
        assert mid not in seen, mid
        seen.add(mid)
        m = {'id': mid, 'k': kind, **build(mid, smi, kind),
             'tx': {'it': dict(zip('nduf', it)), 'en': dict(zip('nduf', en))}}
        out.append(m)
    path = os.path.join(ROOT, 'molecules.json')
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    nb = sum(m['k'] != 's' for m in out)
    print(f'{len(out)} molecole ({nb} costruibili) -> {path} ({os.path.getsize(path)//1024} KB)')


if __name__ == '__main__':
    main()
