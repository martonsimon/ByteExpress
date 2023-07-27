import { ChangeDetectorRef, Component } from '@angular/core';
import { ByteExpressClient, NumberPacket, StringPacket, iRequestContext } from 'byte-express';
import { GatewayService } from '../gateway.service';

export interface TableElement {
  nth: number;
  num: number;
}

@Component({
  selector: 'app-example4',
  templateUrl: './example4.component.html',
  styleUrls: ['./example4.component.scss']
})
export class Example4Component {
  client: ByteExpressClient;
  changeDetectorRef: ChangeDetectorRef;

  startFrom = 0;
  intervals = 500;
  subscribed = false;
  error = false;

  displayedColumns: string[] = ['nth', 'num'];
  dataSource: TableElement[] = [];
  eventCtx: iRequestContext | undefined;

  constructor(gateway: GatewayService, changeDetectorRef: ChangeDetectorRef) { 
    this.client = gateway.networkClient;
    this.changeDetectorRef = changeDetectorRef;
  }

  subscribe(){
    console.log("SSE");
    this.cancel();
    this.subscribed = true;
    this.error = false;
    this.dataSource = [];

    const payload: StringPacket = new StringPacket(JSON.stringify({startFrom: this.startFrom, intervals: this.intervals}));
    this.client.eventRequest("events", payload, ctx => {this.eventCtx = ctx}).subscribe({
      next: (ctx) => {
        let num = (ctx.res.payload as NumberPacket).num;
        console.log(num);
        this.dataSource.push({nth: this.dataSource.length, num: num});
        //this.changeDetectorRef.detectChanges();
        this.dataSource = [...this.dataSource]; //well, its only for testing anyway
      },
      error: (err) => {
        console.log("error");
        this.subscribed = false;
        this.error = true;
        this.eventCtx = undefined;
      },
      complete: () => {
        console.log("complete");
        this.subscribed = false;
        this.error = false;
        this.eventCtx = undefined;
      }
    });
  }
  cancel(){
    if (this.eventCtx){
      this.eventCtx.req.close();
      this.eventCtx = undefined;
    }
    this.subscribed = false;
    this.error = false;
  }
}
