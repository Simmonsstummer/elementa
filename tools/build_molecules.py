"""Builds molecules.json from tools/molecole.py using RDKit (3D coordinates).
Genera molecules.json da tools/molecole.py con RDKit (coordinate 3D).

    pip install rdkit
    python tools/build_molecules.py
"""
import json, os, sys
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
          'cacl2': 'CaCl2', 'cao': 'CaO'}
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
    pts = [conf.GetAtomPosition(i) for i in range(mol.GetNumAtoms())]
    cx = sum(q.x for q in pts) / len(pts); cy = sum(q.y for q in pts) / len(pts); cz = sum(q.z for q in pts) / len(pts)
    atoms, counts = [], {}
    for a, q in zip(mol.GetAtoms(), pts):
        s = a.GetSymbol()
        counts[s] = counts.get(s, 0) + 1
        atoms.append([s, round(q.x - cx, 2), round(q.y - cy, 2), round(q.z - cz, 2)])
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
