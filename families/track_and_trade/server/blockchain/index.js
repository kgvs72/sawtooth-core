/**
 * Copyright 2017 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ----------------------------------------------------------------------------
 */
'use strict'

const { Stream } = require('sawtooth-sdk/messaging/stream')
const { Message } = require('sawtooth-sdk/protobuf')
const deltas = require('./deltas')

const PREFIX = '1c1108'
const VALIDATOR_URL = process.env.VALIDATOR_URL || 'tcp://localhost:4004'
const stream = new Stream(VALIDATOR_URL)

// This workaround is necessary until delta protos are added to SDK
const protobuf = require('protobufjs')
const pbJson = require('sawtooth-sdk/protobuf/protobuf_bundle.json')
const root = protobuf.Root.fromJSON(pbJson)
const StateDeltaSubscribeRequest = root.lookup('StateDeltaSubscribeRequest')
const StateDeltaSubscribeResponse = root.lookup('StateDeltaSubscribeResponse')
const StateDeltaEvent = root.lookup('StateDeltaEvent')

const subscribe = () => {
  stream.connect(() => {
    // Set up onReceive handlers
    stream.onReceive(msg => {
      if (msg.messageType === Message.MessageType.STATE_DELTA_EVENT) {
        deltas.handle(StateDeltaEvent.decode(msg.content))
      } else {
        console.error('Received message of unknown type:', msg.messageType)
      }
    })

    // Send subscribe request
    stream.send(
      Message.MessageType.STATE_DELTA_SUBSCRIBE_REQUEST,
      StateDeltaSubscribeRequest.encode({ addressPrefixes: [PREFIX] }).finish()
    )
      .then(response => StateDeltaSubscribeResponse.decode(response))
      .then(decoded => {
        if (decoded.status !== StateDeltaSubscribeResponse.Status.OK) {
          console.error('Failed to subscribe to blockchain, with status:',
                        decoded.status)
        }
      })
      .catch(err => console.error('Failed to subscribe to blockchain:', err))
  })
}

module.exports = {
  subscribe
}