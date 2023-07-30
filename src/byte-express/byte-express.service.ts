import { Injectable, Logger } from '@nestjs/common';
import { ByteExpressGateway } from './byte-express.gateway';
import { ByteExpressServer } from 'byte-express';
import { ModulesContainer } from '@nestjs/core';
import { MetaConstants } from './route.decorator';

@Injectable()
export class ByteExpressService {
    wsNetwork: ByteExpressServer;

    constructor(private readonly gateway: ByteExpressGateway, private readonly modulesContainer: ModulesContainer) {
        console.log("Initializing ByteExpressService");
        this.wsNetwork = gateway.networkServer;
    }

    printMetadataValues() {
        this.modulesContainer.forEach(module => {
          module.controllers.forEach(controller => {
            this.inspectMetadata(controller.metatype);
          });
        });
      }
    
      private inspectMetadata(target: any) {
        for (const key of Reflect.ownKeys(target.prototype)) {
          const method = target.prototype[key];
          if (typeof method === 'function') {
            const metadataValue = Reflect.getMetadata(MetaConstants.ROUTE, method);
            if (metadataValue) {
              console.log(`Method ${String(key)} has metadata value: ${metadataValue}`);
            }
          }
        }
      }
}
