import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestWithUser } from './jwt.strategy';
import { UserService } from 'src/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/log-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}
  /*authentifier un utilisateur qui se connecte*/
  //1. envoie un mots de passe et un email
  //2. l'api te renvoie un token sécurisé "abc"
  @Post('register')
  async register(@Body() registerBody: CreateUserDto) {
    console.log({ registerBody });
    return await this.authService.register(registerBody);
  }

  //3. tu renvoies ton token sécurisé "access_token"
  //tout requte envoyé ont un access token si cela est valide la requete passe
  @Post('login')
  async login(@Body() authBody: LogUserDto) {
    console.log(authBody);
    return await this.authService.login(authBody);
  }
  @Post('request-reset-password')
  async requestUserPassword(@Body('email') email: string) {
    console.log({ myEmail: email });
    return await this.authService.resetUserPasswordRequest({ email });
  }

  @Post('reset-password')
  async resetPassword(@Body() resetUserPasswordDto: ResetUserPasswordDto) {
    return await this.authService.resetPassword({
      resetUserPasswordDto,
    });
  }

  @Get('verify-reset-password-token')
  async verifyResetPasswordToken(@Query('token') token: string) {
    console.log({ blonblon: token });
    return await this.authService.verifyResetPasswordToken({ token });
  }
  //on veut utiliser jwtStrategy
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAuthenticateUser(@Request() request: RequestWithUser) {
    console.log({ userId: request.user.userId });
    return await this.userService.getUser({ userId: request.user.userId });
  }
}
