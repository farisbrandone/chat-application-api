import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @IsNotEmpty()
  @MinLength(2, {
    message: 'votre mots de passe doit faire plus de 2 charactères',
  })
  password: string;

  @IsString({ message: 'vous devez fournir un token' })
  token: string;
}
