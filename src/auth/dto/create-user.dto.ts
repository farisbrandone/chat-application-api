import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail(
    {},
    {
      message: 'vous devez fournir une adresse email valide',
    },
  )
  email: string;

  @IsNotEmpty()
  @MinLength(2, {
    message: 'votre mots de passe doit faire plus de 2 charactères',
  })
  password: string;

  @IsString({ message: 'vous devez fournir un prenom' })
  firstName: string;
}
