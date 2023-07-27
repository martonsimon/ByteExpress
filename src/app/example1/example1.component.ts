import { Component } from '@angular/core';
import { GatewayService } from '../gateway.service';
import { ByteExpressClient, NullPacket } from 'byte-express';

@Component({
  selector: 'app-example1',
  templateUrl: './example1.component.html',
  styleUrls: ['./example1.component.scss']
})
export class Example1Component {
  client: ByteExpressClient;

  nthPing = 0;
  inProcess = false;
  done = false;
  error = false;
  startTime = 0;
  time = 0;
  timer: NodeJS.Timer | undefined;

  constructor(gateway: GatewayService) { 
    this.client = gateway.networkClient;
  }

  ping(){
    console.log("Pinging server");
    this.nthPing++;
    this.inProcess = true;
    this.done = false;
    this.error = false;
    this.startTime = Date.now();
    this.timer = setInterval(() => {
      this.updateElapsedTime();
    }, 10);

    this.client.request(new NullPacket(), true, "ping").then(ctx => {
      this.inProcess = false;
      this.done = true;
      this.error = false;
      clearInterval(this.timer);
      this.updateElapsedTime();
    }).catch(ctx => {
      this.inProcess = false;
      this.done = false;
      this.error = true;
      clearInterval(this.timer);
      this.updateElapsedTime();
    });
  }

  updateElapsedTime(){
    this.time = Date.now() - this.startTime;
  }
}
