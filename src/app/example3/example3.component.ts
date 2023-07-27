import { Component } from '@angular/core';
import { ByteExpressClient, iStream } from 'byte-express';
import { GatewayService } from '../gateway.service';

@Component({
  selector: 'app-example3',
  templateUrl: './example3.component.html',
  styleUrls: ['./example3.component.scss']
})
export class Example3Component {
  client: ByteExpressClient;

  dataQuantity = 16;
  unitMultiplier = "1024";
  _unitMultiplier = 1024;
  bytesPerAck = 512;

  nthStream = 0;
  inProcess = false;
  done = false;
  error = false;
  startTime = 0;
  time = 0;
  timer: NodeJS.Timer | undefined;

  transferredBytes = 0;
  avgSpeedKb = 0;
  avgSpeedMb = 0;

  private stream: iStream | undefined;

  constructor(gateway: GatewayService) { 
    this.client = gateway.networkClient;
  }

  send(){
    this.cancel();
    
    console.log("Sending data to server");
    this.nthStream++;
    this._unitMultiplier = parseInt(this.unitMultiplier);
    this.inProcess = true;
    this.done = false;
    this.error = false;
    this.startTime = Date.now();
    this.time = 0;
    this.timer = setInterval(() => {
      this.updateStats();
    }, 20);

    this.transferredBytes = 0;
    this.updateStats();

    const bytesAmount = this.dataQuantity * this._unitMultiplier;
    this.client.stream("stream", async stream => {
      this.stream = stream;
      stream.sendNumber(bytesAmount, 4);
      stream.sendNumber(this.bytesPerAck, 4);

      //Send the data
      for (let i = 0; i < Math.ceil(bytesAmount / this.bytesPerAck); i++) {
        const sendAmount = Math.min(this.bytesPerAck, bytesAmount - i * this.bytesPerAck);
        const data = this.generateRandomData(sendAmount);
        stream.sendBytes(data);
        await stream.readAck();

        this.transferredBytes += sendAmount;
      }
    }, (stream, err) => {
      console.log("Stream error");
      this.inProcess = false;
      this.done = false;
      this.error = true;
      clearInterval(this.timer);
      this.updateStats();
      this.stream = undefined;
    }, stream => {
      console.log("Stream completed");
      this.inProcess = false;
      this.done = true;
      this.error = false;
      clearInterval(this.timer);
      this.updateStats();
      this.stream = undefined;
    });
  }

  cancel(){
    if (this.stream)
      this.stream.close();
    this.done = false;
  }

  updateStats(){
    this.time = Date.now() - this.startTime;

    const transferredBits = this.transferredBytes * 8;
    const speed = transferredBits / (this.time / 1000);
    const kbitps = speed / 1000;
    this.avgSpeedKb = kbitps;
    this.avgSpeedMb = kbitps / 1000;
  }

  generateRandomData(N: number): Uint8Array {
    const buffer = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      buffer[i] = Math.floor(Math.random() * 256); // Generates a random number between 0 and 255 (inclusive)
    }
    return buffer;
  }
}
