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

export class NoPuedeModificarseASiMismoException extends DomainException {
  constructor(accion: string) {
    super(`No puedes ${accion} tu propia cuenta. Pide a otro Administrador que lo haga.`);
    this.name = 'NoPuedeModificarseASiMismoException';
  }
}

export class UltimoAdministradorException extends DomainException {
  constructor() {
    super('No se puede completar la operación: debe quedar al menos un Administrador activo en el sistema.');
    this.name = 'UltimoAdministradorException';
  }
}

export class UsuarioConRegistrosAsociadosException extends DomainException {
  constructor() {
    super('No se puede eliminar: este usuario tiene fotos o eventos registrados. Desactívalo en su lugar para conservar el historial.');
    this.name = 'UsuarioConRegistrosAsociadosException';
  }
}
