import { DomainException } from './domain.exceptions';

export class EventoNoEncontradoException extends DomainException {
  constructor(id: string) {
    super(`Evento táctico no encontrado: ${id}`);
    this.name = 'EventoNoEncontradoException';
  }
}

export class TipoActividadNoEncontradoException extends DomainException {
  constructor(id: string) {
    super(`Tipo de actividad no encontrado o inactivo: ${id}`);
    this.name = 'TipoActividadNoEncontradoException';
  }
}

export class TipoActividadYaExisteException extends DomainException {
  constructor(nombre: string) {
    super(`Ya existe un tipo de actividad con el nombre '${nombre}'.`);
    this.name = 'TipoActividadYaExisteException';
  }
}

export class SinPermisosParaEliminarException extends DomainException {
  constructor() {
    super('Solo puede eliminar eventos registrados por usted mismo.');
    this.name = 'SinPermisosParaEliminarException';
  }
}

export class SinPermisosParaEditarException extends DomainException {
  constructor() {
    super('Solo puede editar eventos registrados por usted mismo.');
    this.name = 'SinPermisosParaEditarException';
  }
}
