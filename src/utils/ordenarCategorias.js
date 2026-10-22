// Orden específico de categorías (de menor a mayor)
const ordenCategorias = [
  'ESCUELITA',
  'SUB 11 MIXTO',
  'SUB 10 MIXTO',
  'SUB 9 MIXTO',
  'SUB 13 FEMENINA',
  'SUB 13 MASCULINA',
  'SUB 15 FEMENINA',
  'SUB 15 MASCULINA',
  'SUB 17 FEMENINA',
  'SUB 17 MASCULINA',
  'SUB 19 FEMENINA',
  'SUB 19 MASCULINA',
  'SUB 23 FEMENINA',
  'SUB 23 MASCULINA',
  'ADULTA FEMENINA',
  'ADULTA MASCULINA'
];

export const ordenarCategorias = (categorias) => {
  return [...categorias].sort((a, b) => {
    const indexA = ordenCategorias.indexOf(a.toUpperCase());
    const indexB = ordenCategorias.indexOf(b.toUpperCase());
    
    // Si no está en la lista, va al final
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });
};