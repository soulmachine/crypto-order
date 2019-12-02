import { strict as assert } from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import getExchangeInfo, { ExchangeInfo, PairInfo } from 'exchange-info';
import debug from '../util/debug';
import { USER_CONFIG } from '../config';
import { Params, sort } from '../util/whaleex_sign';

const API_BASE_URL = 'https://www.mxc.com';

// Only the following pairs are tradable via API, see https://www.mxc.com/ucenter/api
const SUPPORTED_PAIRS = [
  'BTC_USDT',
  'BNB_USDT',
  'OMG_USDT',
  'ZEC_USDT',
  'ETH_USDT',
  'AE_USDT',
  'TRX_USDT',
  'ARPA_USDT',
  'ALGO_USDT',
  'ZIL_USDT',
  'VSYS_USDT',
  'ADA_USDT',
  'DOGE_USDT',
  'BSV_USDT',
  'DASH_USDT',
  'ONT_USDT',
  'SERO_USDT',
  'HT_USDT',
  'NAS_USDT',
  'LTC_USDT',
  'EOS_USDT',
  'XLM_USDT',
  'BCH_USDT',
  'XRP_USDT',
  'GRIN_USDT',
  'IRIS_USDT',
];

let MXC_INFO: ExchangeInfo;

function checkTradable(pair: string): boolean {
  const tradable = SUPPORTED_PAIRS.includes(pair);
  assert.ok(tradable, `The pair ${pair} is not tradable through API`);
  return tradable;
}

function sign(params: Params, secretKey: string): [string, string] {
  const paramsText = sort(params);
  const signature = crypto
    .createHash('md5')
    .update(`${paramsText}&api_secret=${secretKey}`)
    .digest('hex');
  return [paramsText, signature];
}

export async function placeOrder(
  pair: string,
  price: string,
  quantity: string,
  sell: boolean,
): Promise<string> {
  assert.ok(pair);
  checkTradable(pair);
  if (MXC_INFO === undefined) {
    MXC_INFO = await getExchangeInfo('MXC');
  }
  const pairInfo = MXC_INFO.pairs[pair] as PairInfo;

  const path = '/open/api/v1/private/order';

  const params = {
    api_key: USER_CONFIG.MXCAccessKey!,
    req_time: Date.now(),
    market: pairInfo.raw_pair,
    price,
    quantity,
    trade_type: sell ? 2 : 1,
  };
  const [paramsText, signature] = sign(params, USER_CONFIG.MXCSecretKey!);

  try {
    const requestUrl = `${API_BASE_URL}${path}?${paramsText}&sign=${signature}`;
    debug(requestUrl);
    const response = await Axios.post(requestUrl);
    assert.equal(response.status, 200);
    assert.equal(response.data.code, 200);

    return response.data.data;
  } catch (e) {
    debug(e);
    throw e;
  }
}

export async function cancelOrder(pair: string, orderId: string): Promise<boolean> {
  assert.ok(pair);
  checkTradable(pair);

  if (MXC_INFO === undefined) {
    MXC_INFO = await getExchangeInfo('MXC');
  }
  const pairInfo = MXC_INFO.pairs[pair] as PairInfo;

  const path = '/open/api/v1/private/order';

  const params = {
    api_key: USER_CONFIG.MXCAccessKey!,
    req_time: Date.now(),
    market: pairInfo.raw_pair,
    trade_no: orderId,
  };
  const [paramsText, signature] = sign(params, USER_CONFIG.MXCSecretKey!);

  const requestUrl = `${API_BASE_URL}${path}?${paramsText}&sign=${signature}`;
  debug(requestUrl);
  const response = await Axios.delete(requestUrl);
  assert.equal(response.status, 200);

  return response.status === 200 && response.data.code === 200;
}

export async function queryOrder(pair: string, orderId: string): Promise<object | undefined> {
  assert.ok(pair);
  checkTradable(pair);

  if (MXC_INFO === undefined) {
    MXC_INFO = await getExchangeInfo('MXC');
  }
  const pairInfo = MXC_INFO.pairs[pair] as PairInfo;

  const path = '/open/api/v1/private/order';

  const params: { [key: string]: any } = {
    api_key: USER_CONFIG.MXCAccessKey!,
    req_time: Date.now(),
    market: pairInfo.raw_pair,
    trade_no: orderId,
  };
  const [paramsText, signature] = sign(params, USER_CONFIG.MXCSecretKey!);

  const requestUrl = `${API_BASE_URL}${path}?${paramsText}&sign=${signature}`;
  debug(requestUrl);
  const response = await Axios.get(requestUrl);
  assert.equal(response.status, 200);
  assert.equal(response.data.code, 200);

  return response.data.data as {
    id: string;
    market: string;
    price: string;
    status: string;
    totalQuantity: string;
    tradedQuantity: string;
    tradedAmount: string;
    createTime: string;
    type: number;
  };
}

// for debug only
export async function getAccountInfo(): Promise<{
  [key: string]: { frozen: string; available: string };
}> {
  assert.ok(USER_CONFIG.MXCAccessKey);
  assert.ok(USER_CONFIG.MXCSecretKey);

  const path = '/open/api/v1/private/account/info';

  const params = {
    api_key: USER_CONFIG.MXCAccessKey!,
    req_time: Date.now(),
  };
  const [paramsText, signature] = sign(params, USER_CONFIG.MXCSecretKey!);

  const requestUrl = `${API_BASE_URL}${path}?${paramsText}&sign=${signature}`;
  debug(requestUrl);
  const response = await Axios.get(requestUrl);
  assert.equal(response.status, 200);

  return response.data;
}