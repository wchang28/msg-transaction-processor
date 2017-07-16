export declare type TransactionId = string;
export interface ITransaction {
    sendRequest(TransactionId: TransactionId): Promise<any>;
    toJSON(): any;
}
export interface ITransactionReceiver {
    on(event: "transaction-res-rcvd", listener: (TransactionId: TransactionId, result: any) => void): this;
}
export interface Options {
    timeoutMS?: number;
}
export interface IMsgTransactionProcessor {
    readonly Options: Options;
    execute<T>(transaction: ITransaction): Promise<T>;
    toJSON(): MsgTransactionProcessorJSON;
    on(event: "change", listener: () => void): this;
    on(event: "transaction-id-generated", listener: (TransactionId: TransactionId, transaction: ITransaction) => void): this;
    on(event: "transaction-req-sent", listener: (TransactionId: TransactionId, transaction: ITransaction) => void): this;
    on(event: "transaction-res-rcvd", listener: (TransactionId: TransactionId, result: any) => void): this;
    on(event: "transaction-error", listener: (TransactionId: TransactionId, transaction: ITransaction, err: any) => void): this;
    on(event: "transaction-success", listener: (TransactionId: TransactionId, transaction: ITransaction, result: any) => void): this;
}
export interface MsgTransactionProcessorJSON {
    Options: Options;
    PendingCount: number;
    PendingTransactions: {
        Id: TransactionId;
        Transaction: any;
    }[];
}
export declare function get(receiver: ITransactionReceiver, options?: Options): IMsgTransactionProcessor;
