import {
  DeleteObjectCommand,
  GetObjectAclCommand,
  GetObjectCommand,
  PutObjectAclCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createId } from '@paralleldrive/cuid2';
import { fileSchema } from 'src/file-utils';
import { z } from 'zod';
import 'dotenv/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_ACCESS_KEY = process.env.ACCESS_KEY_AWS;
const AWS_SECRET = process.env.SECRET_KEY_AWS;
const AWS_REGION = process.env.REGION_AWS;

export class AwsS3Service {
  /**creation du client qui va permettre la connection a awss3 */
  private readonly client: S3Client;
  constructor() {
    const client = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET,
      },
      region: AWS_REGION,
    });
    this.client = client;
  }
  /**création de la fonction qui va permettre de upload notre fichier */
  async uploadFile({ file }: { file: z.infer<typeof fileSchema> }) {
    const createdId = createId();
    const fileKey = createdId + file.originalName;
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.NAME_BUCKET_S3_AWS,
      Key: fileKey /**pour la clé on va utiliser un cuid */,
      ContentType: file.mimetype,
      Body: file.buffer,
      CacheControl: 'max-age-31536000',
    });
    const result = await this.client.send(putObjectCommand);
    if (result.$metadata.httpStatusCode !== 200) {
      console.error(result);
    }
    return { fileKey };
  }

  /**supprimer les images qu'on utilise pas */
  async deleteFile({ filekey }: { filekey: string }) {
    const deleteObjectCommand = new DeleteObjectCommand({
      Bucket: process.env.NAME_BUCKET_S3_AWS,
      Key: filekey /**pour la clé on va utiliser un cuid */,
    });
    const result = await this.client.send(deleteObjectCommand);
    if (result.$metadata.httpStatusCode !== 200) {
      console.error(result);
    }
    return { filekey };
  }

  async getFile({ filekey }: { filekey: string }) {
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.NAME_BUCKET_S3_AWS,
      Key: filekey /**pour la clé on va utiliser un cuid */,
    });
    const result = await getSignedUrl(
      this.client,
      getObjectCommand,
    ); /*this.client.send(getObjectCommand);*/
    /**on ne peut pas return result.body car coté front on ne souhaite pas telecharger l'image en streaming
     * on choisit plutot d'utiliser une url issue de l'image stocké pour l'affiché coté front.
     * or les url sont protege dans aws d'ou l'utilisation des urls signé
     */
    return result;
  }
}
