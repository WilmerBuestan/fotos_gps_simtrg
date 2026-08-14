import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EventoTacticoOrmEntity } from './evento-tactico.orm-entity';

@Entity('evento_fotos')
export class EventoFotoOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'evento_tactico_id' })
  eventoTacticoId: string;

  @ManyToOne(() => EventoTacticoOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_tactico_id' })
  eventoTactico: EventoTacticoOrmEntity;

  @Column({ name: 'ruta_archivo' })
  rutaArchivo: string;

  @Column({ name: 'ruta_miniatura' })
  rutaMiniatura: string;

  @Column({ name: 'nombre_archivo' })
  nombreArchivo: string;

  @Column({ name: 'tamano_bytes', type: 'bigint' })
  tamanoBytes: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
