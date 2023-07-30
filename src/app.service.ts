import { Injectable, Type } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Observable, of, concatMap, take } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Serializable, StringPacket } from 'byte-express';

@Injectable()
export class AppService {

  constructor(private readonly modulesContainer: ModulesContainer) {
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
        const metadataValue = Reflect.getMetadata("byteexpress", method);
        if (metadataValue) {
          console.log(`Method ${String(key)} has metadata value: ${metadataValue}`);
        }
      }
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
