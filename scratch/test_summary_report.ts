import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SummaryReportService } from '../src/services/summary-report.service';
import { AccidentClassificationService } from '../src/services/accident-classification.service';

async function bootstrap() {
  console.log('🚀 Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const summaryReportService = app.get(SummaryReportService);
  const accidentClassificationService = app.get(AccidentClassificationService);
  
  console.log('\n--- 🧪 TEST 1: SummaryReportService (Part I) ---');
  try {
    const resPartI = await summaryReportService.getGeneralSummary({
      year: 2026,
      provinceId: 79,
    });
    console.log('✅ Part I Success! Result:');
    console.dir(resPartI, { depth: null });
  } catch (error) {
    console.error('❌ Part I failed with error:', error);
  }

  console.log('\n--- 🧪 TEST 2: AccidentClassificationService (Part II) ---');
  try {
    const resPartII = await accidentClassificationService.getAccidentClassifiedSummary({
      year: 2026,
      provinceId: 79,
    });
    console.log('✅ Part II Success! Result counts:');
    console.log(`Occupation rows: ${resPartII.byOccupation.length}`);
    console.log(`Cause rows: ${resPartII.byCause.length}`);
    console.log(`Factor rows: ${resPartII.byFactor.length}`);
    console.log('\nFull Result Part II:');
    console.dir(resPartII, { depth: null });
  } catch (error) {
    console.error('❌ Part II failed with error:', error);
  }

  await app.close();
  console.log('\n👋 App context closed.');
}

bootstrap();
