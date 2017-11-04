"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events = require("events");
var _ = require("lodash");
var shortid_1 = require("shortid");
var defautOptions = {
    timeoutMS: 15000
};
var MsgTransactionProcessor = /** @class */ (function (_super) {
    __extends(MsgTransactionProcessor, _super);
    function MsgTransactionProcessor(__receiver, options) {
        var _this = _super.call(this) || this;
        _this.__receiver = __receiver;
        options = options || defautOptions;
        _this.__options = _.assignIn({}, defautOptions, options);
        _this.__pending = {};
        _this.__receiver.on("transaction-res-rcvd", function (TransactionId, result) {
            _this.emit("transaction-res-rcvd", TransactionId, result);
            var item = _this.__pending[TransactionId];
            if (item)
                item.completionCallback(result);
        });
        return _this;
    }
    Object.defineProperty(MsgTransactionProcessor.prototype, "Options", {
        get: function () { return _.assignIn({}, this.__options); },
        enumerable: true,
        configurable: true
    });
    MsgTransactionProcessor.prototype.execute = function (transaction) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var TransactionId = shortid_1.generate();
            _this.emit("transaction-id-generated", TransactionId, transaction);
            transaction.sendRequest(TransactionId).then(function () {
                _this.emit("transaction-req-sent", TransactionId, transaction);
                var item = {
                    transaction: transaction,
                    timer: setTimeout(function () {
                        delete _this.__pending[TransactionId];
                        _this.emit("change");
                        var err = { error: "timeout", error_description: "transaction response timeout" };
                        _this.emit("transaction-error", TransactionId, transaction, err);
                        reject(err);
                    }, _this.__options.timeoutMS),
                    completionCallback: function (result) {
                        clearTimeout(_this.__pending[TransactionId].timer);
                        delete _this.__pending[TransactionId];
                        _this.emit("change");
                        _this.emit("transaction-success", TransactionId, transaction, result);
                        resolve(result);
                    }
                };
                _this.__pending[TransactionId] = item;
                _this.emit("change");
            }).catch(function (err) {
                _this.emit("transaction-error", TransactionId, transaction, err);
                reject(err);
            });
        });
    };
    MsgTransactionProcessor.prototype.toJSON = function () {
        var ret = { Options: this.Options, PendingCount: 0, PendingTransactions: [] };
        for (var TransactionId in this.__pending)
            ret.PendingTransactions.push({ Id: TransactionId, Transaction: this.__pending[TransactionId].transaction.toJSON() });
        ret.PendingCount = ret.PendingTransactions.length;
        return ret;
    };
    return MsgTransactionProcessor;
}(events.EventEmitter));
function get(receiver, options) { return new MsgTransactionProcessor(receiver, options); }
exports.get = get;
//# sourceMappingURL=index.js.map