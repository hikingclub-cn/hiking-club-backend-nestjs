import 'reflect-metadata'; // **** 必须在所有其他导入之前 ****
import { NestFactory, Reflector } from '@nestjs/core'; // **** 1. 导入 Reflector ****
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common'; // **** 2. 导入 ClassSerializerInterceptor ****

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局应用 ValidationPipe (您已有的配置)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // **** 3. 全局应用 ClassSerializerInterceptor ****
  // ClassSerializerInterceptor 需要 Reflector 来读取元数据 (如 @Exclude 装饰器)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ...其他 app 配置 ...
  // 例如，从环境变量读取端口
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`应用程序正在运行于: ${await app.getUrl()}`); // 打印更完整的启动信息
}

bootstrap();