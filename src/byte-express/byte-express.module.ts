import { Module } from '@nestjs/common';
import { ByteExpressController } from './byte-express.controller';
import { ByteExpressService } from './byte-express.service';
import { ByteExpressGateway } from './byte-express.gateway';

@Module({
  controllers: [ByteExpressController],
  providers: [ByteExpressService, ByteExpressGateway]
})
export class ByteExpressModule {}
