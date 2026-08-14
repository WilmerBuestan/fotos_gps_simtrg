// ============================================================
// EXCEPCIONES DE DOMINIO
// Capa: Core > Domain
// Errores semánticos del negocio, independientes de HTTP.
// ============================================================

export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

export class UsuarioNoEncontradoException extends DomainException {
  constructor(identifier: string) {
    super(`Usuario no encontrado: ${identifier}`);
    this.name = 'UsuarioNoEncontradoException';
  }
}

export class UsernameYaExisteException extends DomainException {
  constructor(username: string) {
    super(`El nombre de usuario '${username}' ya está en uso.`);
    this.name = 'UsernameYaExisteException';
  }
}

export class CredencialesInvalidasException extends DomainException {
  constructor() {
    super('Credenciales inválidas. Verifique su usuario y contraseña.');
    this.name = 'CredencialesInvalidasException';
  }
}

export class UsuarioInactivoException extends DomainException {
  constructor() {
    super('La cuenta de usuario está desactivada. Contacte al Administrador.');
    this.name = 'UsuarioInactivoException';
  }
}

export class AccesoNoAutorizadoException extends DomainException {
  constructor(rol: string) {
    super(`El rol '${rol}' no tiene permisos para esta operación.`);
    this.name = 'AccesoNoAutorizadoException';
  }
}
