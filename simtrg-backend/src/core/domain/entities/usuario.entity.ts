// ============================================================
// ENTIDAD DE DOMINIO: Usuario
// Capa: Core > Domain
// NO tiene dependencias de frameworks ni librerías externas.
// Representa las reglas de negocio puras del sistema.
// ============================================================

export enum RolUsuario {
  OPERADOR = 'OPERADOR',
  SUPERVISOR = 'SUPERVISOR',
  ADMINISTRADOR = 'ADMINISTRADOR',
  BODEGUERO = 'BODEGUERO',
}

// Formato militar estándar para mostrar personas en todo el sistema:
// "Grado Apellido Nombre" (el grado se omite si no está registrado).
// Se reutiliza en cada lugar que arma un nombre a partir de datos
// crudos de usuario (no solo aquí en el getter), para que todos
// queden consistentes.
export function formatearNombreCompleto(
  grado: string | null | undefined,
  apellido: string,
  nombre: string,
): string {
  return `${grado ? grado + ' ' : ''}${apellido} ${nombre}`;
}

export class UsuarioDomain {
  constructor(
    public readonly id: string,
    public nombre: string,
    public apellido: string,
    public username: string,
    public passwordHash: string,
    public rol: RolUsuario,
    public activo: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public ultimoAcceso?: Date,
    public ultimaUbicacionLat?: number,
    public ultimaUbicacionLon?: number,
    public ultimaUbicacionProvincia?: string,
    public ultimaUbicacionCanton?: string,
    public ultimaUbicacionParroquia?: string,
    public ultimaUbicacionFecha?: Date,
    public tagRfid?: string,
    public foto?: string,
    public grado?: string,
    public fechaNacimiento?: Date,
    public cedula?: string,
    public chapa?: string,
  ) {}

  // ---- Reglas de Negocio ----

  get nombreCompleto(): string {
    return formatearNombreCompleto(this.grado, this.apellido, this.nombre);
  }

  puedeAccederAlDashboardEstrategico(): boolean {
    return (
      this.rol === RolUsuario.SUPERVISOR ||
      this.rol === RolUsuario.ADMINISTRADOR
    );
  }

  esAdministrador(): boolean {
    return this.rol === RolUsuario.ADMINISTRADOR;
  }

  esOperador(): boolean {
    return this.rol === RolUsuario.OPERADOR;
  }

  desactivar(): void {
    if (!this.activo) {
      throw new Error('El usuario ya está inactivo.');
    }
    this.activo = false;
    this.updatedAt = new Date();
  }

  registrarAcceso(): void {
    this.ultimoAcceso = new Date();
  }

  actualizarUbicacion(
    lat: number,
    lon: number,
    provincia?: string,
    canton?: string,
    parroquia?: string,
  ): void {
    this.ultimaUbicacionLat = lat;
    this.ultimaUbicacionLon = lon;
    this.ultimaUbicacionProvincia = provincia;
    this.ultimaUbicacionCanton = canton;
    this.ultimaUbicacionParroquia = parroquia;
    this.ultimaUbicacionFecha = new Date();
  }
}
