// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package service

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// ContextRegistryMetaData contains all meta data concerning the ContextRegistry contract.
var ContextRegistryMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"AlreadyExists\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint160\",\"name\":\"contextId\",\"type\":\"uint160\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"context\",\"type\":\"string\"}],\"name\":\"ContextRegistered\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"context\",\"type\":\"string\"}],\"name\":\"calculateContextID\",\"outputs\":[{\"internalType\":\"uint160\",\"name\":\"\",\"type\":\"uint160\"}],\"stateMutability\":\"pure\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint160\",\"name\":\"contextId\",\"type\":\"uint160\"}],\"name\":\"getContext\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"context\",\"type\":\"string\"}],\"name\":\"registerContext\",\"outputs\":[{\"internalType\":\"uint160\",\"name\":\"\",\"type\":\"uint160\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// ContextRegistryABI is the input ABI used to generate the binding from.
// Deprecated: Use ContextRegistryMetaData.ABI instead.
var ContextRegistryABI = ContextRegistryMetaData.ABI

// ContextRegistry is an auto generated Go binding around an Ethereum contract.
type ContextRegistry struct {
	ContextRegistryCaller     // Read-only binding to the contract
	ContextRegistryTransactor // Write-only binding to the contract
	ContextRegistryFilterer   // Log filterer for contract events
}

// ContextRegistryCaller is an auto generated read-only Go binding around an Ethereum contract.
type ContextRegistryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ContextRegistryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type ContextRegistryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ContextRegistryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type ContextRegistryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ContextRegistrySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type ContextRegistrySession struct {
	Contract     *ContextRegistry  // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// ContextRegistryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type ContextRegistryCallerSession struct {
	Contract *ContextRegistryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts          // Call options to use throughout this session
}

// ContextRegistryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type ContextRegistryTransactorSession struct {
	Contract     *ContextRegistryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts          // Transaction auth options to use throughout this session
}

// ContextRegistryRaw is an auto generated low-level Go binding around an Ethereum contract.
type ContextRegistryRaw struct {
	Contract *ContextRegistry // Generic contract binding to access the raw methods on
}

// ContextRegistryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type ContextRegistryCallerRaw struct {
	Contract *ContextRegistryCaller // Generic read-only contract binding to access the raw methods on
}

// ContextRegistryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type ContextRegistryTransactorRaw struct {
	Contract *ContextRegistryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewContextRegistry creates a new instance of ContextRegistry, bound to a specific deployed contract.
func NewContextRegistry(address common.Address, backend bind.ContractBackend) (*ContextRegistry, error) {
	contract, err := bindContextRegistry(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &ContextRegistry{ContextRegistryCaller: ContextRegistryCaller{contract: contract}, ContextRegistryTransactor: ContextRegistryTransactor{contract: contract}, ContextRegistryFilterer: ContextRegistryFilterer{contract: contract}}, nil
}

// NewContextRegistryCaller creates a new read-only instance of ContextRegistry, bound to a specific deployed contract.
func NewContextRegistryCaller(address common.Address, caller bind.ContractCaller) (*ContextRegistryCaller, error) {
	contract, err := bindContextRegistry(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &ContextRegistryCaller{contract: contract}, nil
}

// NewContextRegistryTransactor creates a new write-only instance of ContextRegistry, bound to a specific deployed contract.
func NewContextRegistryTransactor(address common.Address, transactor bind.ContractTransactor) (*ContextRegistryTransactor, error) {
	contract, err := bindContextRegistry(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &ContextRegistryTransactor{contract: contract}, nil
}

// NewContextRegistryFilterer creates a new log filterer instance of ContextRegistry, bound to a specific deployed contract.
func NewContextRegistryFilterer(address common.Address, filterer bind.ContractFilterer) (*ContextRegistryFilterer, error) {
	contract, err := bindContextRegistry(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &ContextRegistryFilterer{contract: contract}, nil
}

// bindContextRegistry binds a generic wrapper to an already deployed contract.
func bindContextRegistry(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := ContextRegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_ContextRegistry *ContextRegistryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _ContextRegistry.Contract.ContextRegistryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_ContextRegistry *ContextRegistryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ContextRegistry.Contract.ContextRegistryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_ContextRegistry *ContextRegistryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _ContextRegistry.Contract.ContextRegistryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_ContextRegistry *ContextRegistryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _ContextRegistry.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_ContextRegistry *ContextRegistryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ContextRegistry.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_ContextRegistry *ContextRegistryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _ContextRegistry.Contract.contract.Transact(opts, method, params...)
}

// CalculateContextID is a free data retrieval call binding the contract method 0xf94ea222.
//
// Solidity: function calculateContextID(string context) pure returns(uint160)
func (_ContextRegistry *ContextRegistryCaller) CalculateContextID(opts *bind.CallOpts, context string) (*big.Int, error) {
	var out []interface{}
	err := _ContextRegistry.contract.Call(opts, &out, "calculateContextID", context)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// CalculateContextID is a free data retrieval call binding the contract method 0xf94ea222.
//
// Solidity: function calculateContextID(string context) pure returns(uint160)
func (_ContextRegistry *ContextRegistrySession) CalculateContextID(context string) (*big.Int, error) {
	return _ContextRegistry.Contract.CalculateContextID(&_ContextRegistry.CallOpts, context)
}

// CalculateContextID is a free data retrieval call binding the contract method 0xf94ea222.
//
// Solidity: function calculateContextID(string context) pure returns(uint160)
func (_ContextRegistry *ContextRegistryCallerSession) CalculateContextID(context string) (*big.Int, error) {
	return _ContextRegistry.Contract.CalculateContextID(&_ContextRegistry.CallOpts, context)
}

// GetContext is a free data retrieval call binding the contract method 0x424f5bf5.
//
// Solidity: function getContext(uint160 contextId) view returns(string)
func (_ContextRegistry *ContextRegistryCaller) GetContext(opts *bind.CallOpts, contextId *big.Int) (string, error) {
	var out []interface{}
	err := _ContextRegistry.contract.Call(opts, &out, "getContext", contextId)

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// GetContext is a free data retrieval call binding the contract method 0x424f5bf5.
//
// Solidity: function getContext(uint160 contextId) view returns(string)
func (_ContextRegistry *ContextRegistrySession) GetContext(contextId *big.Int) (string, error) {
	return _ContextRegistry.Contract.GetContext(&_ContextRegistry.CallOpts, contextId)
}

// GetContext is a free data retrieval call binding the contract method 0x424f5bf5.
//
// Solidity: function getContext(uint160 contextId) view returns(string)
func (_ContextRegistry *ContextRegistryCallerSession) GetContext(contextId *big.Int) (string, error) {
	return _ContextRegistry.Contract.GetContext(&_ContextRegistry.CallOpts, contextId)
}

// RegisterContext is a paid mutator transaction binding the contract method 0x3af6bf38.
//
// Solidity: function registerContext(string context) returns(uint160)
func (_ContextRegistry *ContextRegistryTransactor) RegisterContext(opts *bind.TransactOpts, context string) (*types.Transaction, error) {
	return _ContextRegistry.contract.Transact(opts, "registerContext", context)
}

// RegisterContext is a paid mutator transaction binding the contract method 0x3af6bf38.
//
// Solidity: function registerContext(string context) returns(uint160)
func (_ContextRegistry *ContextRegistrySession) RegisterContext(context string) (*types.Transaction, error) {
	return _ContextRegistry.Contract.RegisterContext(&_ContextRegistry.TransactOpts, context)
}

// RegisterContext is a paid mutator transaction binding the contract method 0x3af6bf38.
//
// Solidity: function registerContext(string context) returns(uint160)
func (_ContextRegistry *ContextRegistryTransactorSession) RegisterContext(context string) (*types.Transaction, error) {
	return _ContextRegistry.Contract.RegisterContext(&_ContextRegistry.TransactOpts, context)
}

// ContextRegistryContextRegisteredIterator is returned from FilterContextRegistered and is used to iterate over the raw logs and unpacked data for ContextRegistered events raised by the ContextRegistry contract.
type ContextRegistryContextRegisteredIterator struct {
	Event *ContextRegistryContextRegistered // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ContextRegistryContextRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ContextRegistryContextRegistered)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ContextRegistryContextRegistered)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ContextRegistryContextRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ContextRegistryContextRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ContextRegistryContextRegistered represents a ContextRegistered event raised by the ContextRegistry contract.
type ContextRegistryContextRegistered struct {
	ContextId *big.Int
	Context   string
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterContextRegistered is a free log retrieval operation binding the contract event 0xca702642220323c022e777423c5022781e7d240bbaf55c6b5c2a9d3203415dea.
//
// Solidity: event ContextRegistered(uint160 indexed contextId, string context)
func (_ContextRegistry *ContextRegistryFilterer) FilterContextRegistered(opts *bind.FilterOpts, contextId []*big.Int) (*ContextRegistryContextRegisteredIterator, error) {

	var contextIdRule []interface{}
	for _, contextIdItem := range contextId {
		contextIdRule = append(contextIdRule, contextIdItem)
	}

	logs, sub, err := _ContextRegistry.contract.FilterLogs(opts, "ContextRegistered", contextIdRule)
	if err != nil {
		return nil, err
	}
	return &ContextRegistryContextRegisteredIterator{contract: _ContextRegistry.contract, event: "ContextRegistered", logs: logs, sub: sub}, nil
}

// WatchContextRegistered is a free log subscription operation binding the contract event 0xca702642220323c022e777423c5022781e7d240bbaf55c6b5c2a9d3203415dea.
//
// Solidity: event ContextRegistered(uint160 indexed contextId, string context)
func (_ContextRegistry *ContextRegistryFilterer) WatchContextRegistered(opts *bind.WatchOpts, sink chan<- *ContextRegistryContextRegistered, contextId []*big.Int) (event.Subscription, error) {

	var contextIdRule []interface{}
	for _, contextIdItem := range contextId {
		contextIdRule = append(contextIdRule, contextIdItem)
	}

	logs, sub, err := _ContextRegistry.contract.WatchLogs(opts, "ContextRegistered", contextIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ContextRegistryContextRegistered)
				if err := _ContextRegistry.contract.UnpackLog(event, "ContextRegistered", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseContextRegistered is a log parse operation binding the contract event 0xca702642220323c022e777423c5022781e7d240bbaf55c6b5c2a9d3203415dea.
//
// Solidity: event ContextRegistered(uint160 indexed contextId, string context)
func (_ContextRegistry *ContextRegistryFilterer) ParseContextRegistered(log types.Log) (*ContextRegistryContextRegistered, error) {
	event := new(ContextRegistryContextRegistered)
	if err := _ContextRegistry.contract.UnpackLog(event, "ContextRegistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
