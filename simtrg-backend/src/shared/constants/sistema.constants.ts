export const SISTEMA = {
  NOMBRE: 'SIMTRG',
  VERSION: '1.0.0',
  UNIDAD: '29 BIM - GMREC',
} as const;

export const TOKENS = {
  USUARIO_REPOSITORY: 'IUsuarioRepository',
} as const;

// Injection tokens para repositorios (alternativa a usar la clase abstracta)
export const INJECTION_TOKENS = {
  USUARIO_REPO: Symbol('IUsuarioRepository'),
} as const;
