import * as events from "events";
import * as _ from "lodash";
import {generate} from "shortid";

export type TransactionId = string;

export interface ITransaction {
    sendRequest(TransactionId: TransactionId): Promise<any>;
    toJSON() : any;
}

export interface ITransactionReceiver { // the object that recieve the transaction response
    on(event: "transaction-res-rcvd", listener: (TransactionId: TransactionId, result: any) => void) : this;
}

interface TransactionItem {
    transaction: ITransaction;
    timer: NodeJS.Timer;
    completionCallback: (result: any) => void;
}

export interface Options {
    timeoutMS?: number;
}

export interface IMsgTransactionProcessor {
    readonly Options: Options;
    execute<T>(transaction: ITransaction) : Promise<T>;
    toJSON() : MsgTransactionProcessorJSON;

    on(event: "change", listener: () => void) : this;
    on(event: "transaction-id-generated", listener: (TransactionId: TransactionId, transaction: ITransaction) => void) : this;
    on(event: "transaction-req-sent", listener: (TransactionId: TransactionId, transaction: ITransaction) => void) : this;
    on(event: "transaction-res-rcvd", listener: (TransactionId: TransactionId, result: any) => void) : this;
    on(event: "transaction-error", listener: (TransactionId: TransactionId, transaction: ITransaction, err: any) => void) : this;
    on(event: "transaction-success", listener: (TransactionId: TransactionId, transaction: ITransaction, result: any) => void) : this;
}

export interface MsgTransactionProcessorJSON {
    Options: Options;
    PendingCount: number;
    PendingTransactions: {Id:TransactionId, Transaction: any}[];
}

let defautOptions: Options = {
    timeoutMS: 15000
}

class MsgTransactionProcessor extends events.EventEmitter implements IMsgTransactionProcessor {
    private __options: Options;
    private __pending: {[TransactionId: string]: TransactionItem}; // map from transaction id to TransactionItem
    constructor(private __receiver: ITransactionReceiver, options?: Options) {
        super();
        options = options || defautOptions;
        this.__options = _.assignIn({}, defautOptions, options);
        this.__pending = {};
        this.__receiver.on("transaction-res-rcvd", (TransactionId: TransactionId, result: any) => {
            this.emit("transaction-res-rcvd", TransactionId, result);
            let item = this.__pending[TransactionId];
            if (item)
                item.completionCallback(result);
        })
    }
    get Options() : Options {return _.assignIn({}, this.__options);}
    execute<T>(transaction: ITransaction) : Promise<T> {
        return new Promise<any>((resolve: (value: any) => void, reject: (err: any) => void) => {
            let TransactionId = generate();
            this.emit("transaction-id-generated", TransactionId, transaction);
            transaction.sendRequest(TransactionId).then(() => {
                this.emit("transaction-req-sent", TransactionId, transaction);
                let item: TransactionItem = {
                    transaction
                    ,timer: setTimeout(() => {
                        delete this.__pending[TransactionId];
                        this.emit("change");
                        let err : any = {error: "timeout", error_description: "transaction response timeout"};
                        this.emit("transaction-error", TransactionId, transaction, err);
                        reject(err);
                    }, this.__options.timeoutMS)
                    ,completionCallback: (result: any) => {
                        clearTimeout(this.__pending[TransactionId].timer);
                        delete this.__pending[TransactionId];
                        this.emit("change");
                        this.emit("transaction-success", TransactionId, transaction, result);
                        resolve(result);
                    }
                };
                this.__pending[TransactionId] = item;
                this.emit("change");
            }).catch((err: any) => {
                this.emit("transaction-error", TransactionId, transaction, err);
                reject(err);
            });
        });
    }
    toJSON() : MsgTransactionProcessorJSON {
        let ret: MsgTransactionProcessorJSON = {Options: this.Options, PendingCount:0, PendingTransactions: []};
        for (let TransactionId in this.__pending)
            ret.PendingTransactions.push({Id: TransactionId, Transaction: this.__pending[TransactionId].transaction.toJSON()});
        ret.PendingCount = ret.PendingTransactions.length;
        return ret; 
    }
}

export function get(receiver: ITransactionReceiver, options?: Options) : IMsgTransactionProcessor {return new MsgTransactionProcessor(receiver, options);}