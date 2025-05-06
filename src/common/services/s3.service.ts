import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    // Carga la configuración de AWS desde las variables de entorno
    this.region = this.configService.get<string>('AWS_REGION');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    // Valida que la configuración esencial esté presente
    if (!this.region || !this.bucketName || !accessKeyId || !secretAccessKey) {
      this.logger.error(
        'Missing AWS S3 configuration in environment variables.',
      );
      throw new InternalServerErrorException(
        'AWS S3 configuration is incomplete.',
      );
    }

    // Crea el cliente S3 v3
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    this.logger.log(
      `S3Service initialized for bucket: ${this.bucketName} in region: ${this.region}`,
    );
  }
  async getPresignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    this.logger.log(
      `Generating presigned URL for key: ${key}, expires in: ${expiresInSeconds}s`,
    );

    // Crea el comando para obtener el objeto
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      // Puedes añadir otros parámetros aquí si los necesitas, como ResponseContentType
      // ResponseContentType: 'application/pdf',
    });

    try {
      // Genera la URL pre-firmada usando el cliente S3, el comando y el tiempo de expiración
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
      this.logger.log(`Successfully generated presigned URL for key: ${key}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for key ${key}: ${error.message}`,
        error.stack,
      );
      // Considera usar tus constantes de error aquí
      throw new InternalServerErrorException(
        'Could not generate the download link.',
      );
    }
  }

  async uploadFile(fileBuffer: any, key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    try {
      const output = await this.s3Client.send(command);
      this.logger.log(
        `File uploaded successfully to S3. Key: ${key}, ETag: ${output.ETag}`,
      );
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to upload file to S3 key ${key}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not upload the file to storage.',
      );
    }
  }

  // Puedes añadir otros métodos para interactuar con S3 si los necesitas (delete, list, etc.)
}
