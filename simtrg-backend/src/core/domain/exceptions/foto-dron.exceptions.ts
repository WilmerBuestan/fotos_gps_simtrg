import { DomainException } from './domain.exceptions';

export class ArchivoNoEsImagenException extends DomainException {
  constructor(filename: string) {
    super(`El archivo '${filename}' no es una imagen válida (.jpg, .jpeg, .png).`);
    this.name = 'ArchivoNoEsImagenException';
  }
}

export class CoordenadasFueraDeGeocercaException extends DomainException {
  constructor(lat: number, lon: number) {
    super(
      `Las coordenadas (${lat}, ${lon}) están fuera del área operacional asignada a la Brigada.`,
    );
    this.name = 'CoordenadasFueraDeGeocercaException';
  }
}

export class SinCoordenadasException extends DomainException {
  constructor(filename: string) {
    super(
      `La foto '${filename}' no contiene datos GPS en sus metadatos EXIF. Se requiere asignación manual de coordenadas.`,
    );
    this.name = 'SinCoordenadasException';
  }
}

export class CargaMasivaVaciaException extends DomainException {
  constructor() {
    super('No se recibieron archivos para procesar.');
    this.name = 'CargaMasivaVaciaException';
  }
}

export class CoordenadasYaAsignadasException extends DomainException {
  constructor() {
    super('La foto ya tiene coordenadas EXIF. No se puede sobreescribir.');
    this.name = 'CoordenadasYaAsignadasException';
  }
}
