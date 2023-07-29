import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { ByteExpressModule } from './byte-express/byte-express.module';
import { ByteExpressGateway } from './byte-express/byte-express.gateway';

@Module({
  imports: [ByteExpressModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
