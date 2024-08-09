import { Global, Module } from '@nestjs/common';
import { SocketService } from './socket.service';

@Global() //permet de réaliser l'export partout
@Module({
  providers: [SocketService],
  exports: [SocketService], //l'exporte pour qu'il soit utiliser partout
})
export class SocketModule {}
