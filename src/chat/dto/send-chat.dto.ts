import { IsString, MinLength } from 'class-validator';

export class SendChatDto {
  @IsString({
    message: 'vous devez fournir un message',
  })
  @MinLength(1, {
    message: 'votre message doit contenir au moins un caractère',
  })
  content: string;
}
