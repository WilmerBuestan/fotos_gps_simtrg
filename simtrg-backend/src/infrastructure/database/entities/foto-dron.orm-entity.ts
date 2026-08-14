import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UsuarioOrmEntity } from './usuario.orm-entity';
import { OrigenCoordenada } from '../../../core/domain/entities/foto-dron.entity';

@Entity('fotos_dron')
export class FotoDronOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ruta_archivo' })
  rutaArchivo: string;

  @Column({ name: 'ruta_miniatura' })
  rutaMiniatura: string;

  @Column({ type: 'double precision', nullable: true })
  latitud: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitud: number | null;

  @Column({ name: 'fecha_captura', nullable: true, type: 'timestamptz' })
  fechaCaptura: Date | null;

  @Column({ name: 'es_coordenada_manual', default: false })
  esCoordenadasManual: boolean;

  @Column({
    name: 'origen_coordenada',
    type: 'enum',
    enum: OrigenCoordenada,
    nullable: true,
  })
  origenCoordenada: OrigenCoordenada | null;

  @Column({ name: 'nombre_archivo' })
  nombreArchivo: string;

  @Column({ name: 'tamano_bytes', type: 'bigint' })
  tamanoBytes: number;

  @Column({ type: 'varchar', nullable: true })
  provincia: string | null;

  @Column({ type: 'varchar', nullable: true })
  canton: string | null;

  @Column({ name: 'operador_id' })
  operadorId: string;

  @ManyToOne(() => UsuarioOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'operador_id' })
  operador: UsuarioOrmEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
