import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { SocketService } from './socket/socket.service';
import { Global, OnModuleInit } from '@nestjs/common';
@Global()
@WebSocketGateway(8001 /*port du server websocket*/, {
  cors: '*',
})
export class AppGateway implements OnGatewayInit, OnModuleInit {
  //envoyer une notification de type confirmation au frontend: OnModuleInit
  //assigné la valeur du serveur à la variable server
  //pour cela on implement une classe spécifique au websocket OnGateWayInit
  //envoyer notre premier message en declarant des routes au travers des décorators
  @WebSocketServer()
  private readonly server: Server;
  //comme on ne fait pas d'injection de dépendance cette variable est initialisé à undefined
  constructor(private socketService: SocketService) {}
  //OnGateWay nous permet de definr une nouvelle méthode aferInit
  afterInit() {
    /**La logique de cette méthode sera éxécuter après l'initialisation
     * de notre GateWAY
     */
    this.socketService.server = this.server; //serveur égale au serveur appGateWAY qui lui est défini
  }
  onModuleInit() {
    //emittion d'une notification de type confirmation au front
    this.server.emit('confirmation');
  }
  @SubscribeMessage(
    'test' /**ce paramètre est la valeur utilisé coté client pour communiqué avec notre serveur le message est envoyé à l'évènement test*/,
  )
  sendMessage(
    @MessageBody()
    data /*permet d'avoir access au corps de donnée envoyé par la requete websocket*/,
    @ConnectedSocket()
    socket: Socket /**permet de répondre au client qui a envoyer le message */,
  ) {
    console.log(data);
    socket.emit('chat', "salut j'ai bien recus ton message");
  }

  @SubscribeMessage(
    'joint-chat-room' /**permet de faire convercer et donc d'envoyer des notifivation a tous ceux qui ont le meme ConversationID*/,
  )
  async joinChatRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(conversationId);
  }
}
