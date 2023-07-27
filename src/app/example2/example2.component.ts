import { Component } from '@angular/core';
import { ByteExpressClient, StringPacket } from 'byte-express';
import { GatewayService } from '../gateway.service';

@Component({
  selector: 'app-example2',
  templateUrl: './example2.component.html',
  styleUrls: ['./example2.component.scss']
})
export class Example2Component {
  client: ByteExpressClient;

  strPayload = "";
  rndNum = 0;
  response = "<no response>";

  inProcess = false;
  done = false;
  error = false;
  startTime = 0;
  time = 0;
  timer: NodeJS.Timer | undefined;

  constructor(gateway: GatewayService){
    this.client = gateway.networkClient;
  }

  send(){
    console.log("Sending request with string payload");
    this.inProcess = true;
    this.done = false;
    this.error = false;
    this.rndNum = Math.floor(Math.random() * 1000000);
    this.startTime = Date.now();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.updateElapsedTime();
    }, 10);

    let reqObj = {msg: this.strPayload, rnd: this.rndNum};
    this.client.request(new StringPacket(JSON.stringify(reqObj)), true, "example2").then(ctx => {
      this.inProcess = false;
      this.done = true;
      this.error = false;
      clearInterval(this.timer);
      this.updateElapsedTime();
      
      let response = (ctx.res.payload as StringPacket).text;
      this.response = response;
    }).catch(ctx => {
      console.log("an error");
      this.inProcess = false;
      this.done = false;
      this.error = true;
      clearInterval(this.timer);
      this.updateElapsedTime();
    });

  }
  reset(){
    this.strPayload = "";
    this.rndNum = 0;
    this.inProcess = false;
    this.done = false;
    this.error = false;
    this.startTime = 0;
    this.time = 0;
    clearInterval(this.timer);
    this.timer = undefined;
    this.response = "";
  }

  updateElapsedTime(){
    this.time = Date.now() - this.startTime;
  }
}

