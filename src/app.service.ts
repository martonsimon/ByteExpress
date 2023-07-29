import { Injectable, Type } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

@Injectable()
export class AppService {

  constructor(private readonly modulesContainer: ModulesContainer) {
    this.printMetadataValues();
    console.log("test");
    type testType = (str: string) => number;
    let testFn1: any = function (str: string): number {
      return 1;
    }
    let testFn2: any = function (str: number): string {
      return "2";
    }
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
