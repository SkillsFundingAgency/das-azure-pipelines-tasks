import * as crypto from 'crypto';
import * as r from 'request-promise-native';

export interface ILogAnalyticsResponse {
  name: string;
  stausCode: number;
  message: string;
}

export interface ILogAnalytics {
  sendLogAnalyticsData(body: string, logType: string): Promise<ILogAnalyticsResponse>;
}

export class LogAnalytics implements ILogAnalytics {
  constructor(private customerId: string, private sharedKey: string) {

  }

  private buildSignature(date: string, contentLength: number): string {
    const string = `POST\n${contentLength}\napplication/json\nx-ms-date:${date}\n/api/logs`;
    const key = Buffer.from(this.sharedKey, 'base64');

    const encodedHash = crypto.createHmac('sha256', key)
      .update(string)
      .digest('base64');
    return `SharedKey ${this.customerId}:${encodedHash}`;
  }

  async sendLogAnalyticsData(body: string, logType: string): Promise<ILogAnalyticsResponse> {
    const date: string = new Date().toUTCString();
    const sig: string = this.buildSignature(date, Buffer.byteLength(body, 'utf8'));

    const headers = {
      'Content-Type': 'application/json',
      Authorization: sig,
      'Log-Type': logType,
      'x-ms-date': date,
    };

    const options = {
      url: `https://${this.customerId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`,
      headers,
      body,
      resolveWithFullResponse: true,
    };

    return r.post(options)
      .then((response) => ({
        name: 'Success',
        stausCode: response.statusCode,
        message: 'The Log Analytics operation was successful',
      }))
      .catch((err) => {
        const resErr = JSON.parse(err.response.body);

        return {
          name: resErr.Error,
          stausCode: err.statusCode,
          message: resErr.Message,
        };
      });
  }
}
