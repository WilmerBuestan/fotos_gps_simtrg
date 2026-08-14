import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin.simtrg', description: 'Nombre de usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El username es obligatorio.' })
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'Clave@Segura123', description: 'Contraseña' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;
}
