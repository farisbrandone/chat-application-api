import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestWithUser } from 'src/auth/jwt.strategy';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileSchema } from 'src/file-utils';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get()
  getHello() {
    return this.userService.getUsers();
  }

  @Get('/:userId')
  getUser(@Param('userId') userId: string) {
    return this.userService.getUser({ userId });
  }

  @UseGuards(
    JwtAuthGuard,
  ) /**accéder au donner utilisateur dans la requetes grace à @Req */
  @UseInterceptors(
    FileInterceptor('file' /**or avatar */),
  ) /**il vas permettre d'intercepter le fichier envoyé dans le body sous la forme formData */
  @Post('/:userId') /**les utilisateurs y accèdent pour modifier leur profil */
  async updateUser(
    @Req() requestWithUser: RequestWithUser,
    /*@Param('userId') userId: string, plus besoinde récupérer l'id */
    @Body() updatedUserData: unknown /**vue qu'on a pas encore créer le dto */,
    @UploadedFile()
    file /**le fichier est de type any utilisons zod pour le parsé-typé */,
  ) {
    const submittedFile = fileSchema.parse(file);
    console.log(updatedUserData, submittedFile);
    return this.userService.updateUser({
      userId: requestWithUser.user.userId,
      submittedFile,
    });
  }
}
