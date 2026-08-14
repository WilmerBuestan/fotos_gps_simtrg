// ============================================================
// ENTIDAD DE DOMINIO: TipoActividad
// Catálogo paramétrico con borrado lógico.
// El Administrador gestiona los tipos sin tocar código fuente.
// ============================================================

export class TipoActividadDomain {
  constructor(
    public readonly id: string,
    public nombre: string,
    public descripcion: string | null,
    public activo: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  // ---- Reglas de negocio ----

  desactivar(): void {
    if (!this.activo) throw new Error(`El tipo '${this.nombre}' ya está inactivo.`);
    this.activo = false;
    this.updatedAt = new Date();
  }

  activar(): void {
    if (this.activo) throw new Error(`El tipo '${this.nombre}' ya está activo.`);
    this.activo = true;
    this.updatedAt = new Date();
  }

  estaActivo(): boolean {
    return this.activo;
  }
}
