import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LogUserDto {
  @IsEmail(
    {},
    {
      message: 'vous devez fournir une adresse email valide',
    },
  )
  email: string;

  @IsNotEmpty()
  @MinLength(2, {
    message: 'votre mots de passe doit faire plus de 8 charactères',
  })
  password: string;
}
