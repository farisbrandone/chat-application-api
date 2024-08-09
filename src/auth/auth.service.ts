import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/user/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Payload } from '@prisma/client/runtime/library';
import { UserPayload } from './jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/log-user.dto';
import { MailerService } from 'src/mailer.service';
import { createId } from '@paralleldrive/cuid2';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

/*const ids = [
  createId(), // 'tz4a98xxat96iws9zmbrgj3a'
  createId(), // 'pfh0haxfpzowht3oi213cqos'
  createId(), // 'nc6bzmkmd014706rfda898to'
];*/
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}
  async login(authBody: LogUserDto) {
    const { email, password } = authBody;
    try {
      //const hashPassword = await this.hashPassword({ password });

      const existingUser = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (!existingUser) {
        throw new Error("L'utilisateur n'existe pas");
      }
      const isPasswordValid = await this.isPasswordValid({
        password,
        hashedPassword: existingUser.password,
      });
      if (!isPasswordValid) {
        throw new Error('le mots de passe est incorrect');
      }

      return await this.authenticateUser({ userId: existingUser.id });
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async register(registerBody: CreateUserDto) {
    const { email, firstName, password } = registerBody;

    try {
      console.log({ email, firstName, password });

      //const hashPassword = await this.hashPassword({ password });

      const existingUser = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (existingUser) {
        throw new Error('Un compte existe deja à cette adresse');
      }
      const hashPassword = await this.hashPassword({ password });
      const createdUser = await this.prisma.user.create({
        data: {
          email,
          password: hashPassword,
          firstName,
        },
      });
      await this.mailerService.sendEmail({
        recipient: email,
      });
      return await this.authenticateUser({ userId: createdUser.id });
    } catch (error) {
      return {
        error: true,
        message: error.message,
      };
    }
  }

  private async hashPassword({ password }: { password: string }) {
    const hashPassword = await bcrypt.hash(password, 10);
    return hashPassword;
  }

  private async isPasswordValid({
    password,
    hashedPassword,
  }: {
    password: string;
    hashedPassword: string;
  }) {
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    return isPasswordValid;
  }

  private async authenticateUser({ userId }: UserPayload) {
    const payload = { userId };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async resetUserPasswordRequest({ email }: { email: string }) {
    try {
      //const hashPassword = await this.hashPassword({ password });

      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: email,
        },
      });
      if (!existingUser) {
        throw new Error("L'utilisateur n'existe pas");
      }
      if (existingUser.isResettingPassword === true) {
        throw new Error(
          'Une demande de réinitialisation de mots de pase est déja faite',
        );
      }
      const createdId = createId();
      await this.prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          isResettingPassword: true,
          resetPasswordToken: createdId,
        },
      });

      await this.mailerService.sendRequestedEmailPassword({
        recipient: existingUser.email,
        token: createdId,
      });

      return {
        error: false,
        message:
          'Veillez consulter vos emails pour réinitialiser votre mot de passe',
      };
    } catch (error) {
      console.log({ myError: error });
      return { error: true, message: `${error.message}` };
    }
  }

  async verifyResetPasswordToken({ token }: { token: string }) {
    try {
      //const hashPassword = await this.hashPassword({ password });

      const existingUser = await this.prisma.user.findUnique({
        where: {
          resetPasswordToken: token,
        },
      });
      if (!existingUser) {
        throw new Error("L'utilisateur n'existe pas");
      }
      //si la demande n'est pas en cour aucune demande de réeinitialisation sera faite
      if (existingUser.isResettingPassword === false) {
        throw new Error(
          "Une demande de réinitialisation de mots de pase n'est pas en cour",
        );
      }

      return {
        error: false,
        message: 'le token est valide et peut etre utilisé',
      };
    } catch (error) {
      console.log({ myError: error });
      return { error: true, message: `${error.message}` };
    }
  }

  async resetPassword({
    resetUserPasswordDto,
  }: {
    resetUserPasswordDto: ResetUserPasswordDto;
  }) {
    try {
      const { password, token } = resetUserPasswordDto;

      const existingUser = await this.prisma.user.findUnique({
        where: {
          resetPasswordToken: token,
        },
      });
      if (!existingUser) {
        throw new Error("L'utilisateur n'existe pas");
      }
      if (existingUser.isResettingPassword === false) {
        throw new Error(
          'Aucune demande de réinitialisation de mots de pase est en cour',
        );
      }
      const hashPassword = await this.hashPassword({ password });
      await this.prisma.user.update({
        where: {
          resetPasswordToken: token,
        },
        data: {
          isResettingPassword: false,
          password: hashPassword,
        },
      });
      return {
        error: false,
        message: 'Votre mot de passe à bien été changer',
      };
    } catch (error) {
      console.log({ myError: error });
      return { error: true, message: `${error.message}` };
    }
  }
}
