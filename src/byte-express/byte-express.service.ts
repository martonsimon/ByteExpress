import { Injectable } from '@nestjs/common';
import { ByteExpressGateway } from './byte-express.gateway';
import { ByteExpressServer } from 'byte-express';

@Injectable()
export class ByteExpressService {
    wsNetwork: ByteExpressServer;

    constructor(private readonly gateway: ByteExpressGateway) {
        this.wsNetwork = gateway.networkServer;
    }
}
