import * as crypto from 'crypto';
import * as request from 'request-promise-native';

interface ILogAnalyticsRequestHeaders {
  'Content-Type': string;
  Authorization: string;
  'Log-Type': string;
  'x-ms-date': string;
  'time-generated-field'?: string;
}

export interface ILogAnalyticsResponse {
  name: string;
  stausCode: number;
  message: string;
}

export interface ILogAnalyticsClient {
  sendLogAnalyticsData(
    body: string, logType: string, timeGeneratedField?: string): Promise<ILogAnalyticsResponse>;
}

export class LogAnalyticsClient implements ILogAnalyticsClient {
  constructor(private workspaceId: string, private sharedKey: string) {

  }

  private buildSignature(date: string, contentLength: number): string {
    const string = `POST\n${contentLength}\napplication/json\nx-ms-date:${date}\n/api/logs`;
    const key = Buffer.from(this.sharedKey, 'base64');

    const encodedHash = crypto.createHmac('sha256', key)
      .update(string)
      .digest('base64');
    return `SharedKey ${this.workspaceId}:${encodedHash}`;
  }

  async sendLogAnalyticsData(
    body: string, logType: string, timeGeneratedField?: string,
  ): Promise<ILogAnalyticsResponse> {
    const date: string = new Date().toUTCString();
    const sig: string = this.buildSignature(date, Buffer.byteLength(body, 'utf8'));

    const headers: ILogAnalyticsRequestHeaders = {
      'Content-Type': 'application/json',
      Authorization: sig,
      'Log-Type': logType,
      'x-ms-date': date,
    };

    if (timeGeneratedField) {
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      if (!isoPattern.test(timeGeneratedField)) {
        throw new Error('The parameter [timeGeneratedField] should follow the ISO 8601 format (YYYY-MM-DDThh:mm:ssZ)');
      }

      headers['time-generated-field'] = timeGeneratedField;
    }

    const options = {
      url: `https://${this.workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`,
      headers,
      body,
      resolveWithFullResponse: true,
    };

    const response = await request.post(options)
      .then((r) => ({
        name: 'DataSubmitted',
        stausCode: r.statusCode,
        message: 'OK',
      }))
      .catch((err) => ({
        name: err.name,
        stausCode: err.statusCode,
        message: err.resonse ? err.response : JSON.parse(err.response.body),
      }));

    return response;
  }
}
