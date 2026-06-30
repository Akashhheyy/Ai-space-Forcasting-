"""Quick validation script for ML pipeline (no database required)."""

import asyncio

from app.machine_learning.predictor import RadiationPredictor
from app.machine_learning.trainer import ModelTrainer
from app.services.data_collector import NOAADataCollector
from app.utilities.config import settings


async def main() -> None:
    df = await NOAADataCollector().collect_merged_data()
    settings.min_training_samples = 50
    trainer = ModelTrainer()

    for horizon in settings.forecast_horizons:
        results = trainer.train_and_evaluate(df, horizon)
        best = trainer.select_best_model(results)
        print(
            f"h={horizon}m best={best['model_name']} "
            f"RMSE={best['rmse']:.4f} R2={best['r2_score']:.4f}"
        )
        trainer.registry.save_best_model_metadata(
            best["model_name"],
            horizon,
            {"mae": best["mae"], "rmse": best["rmse"], "r2_score": best["r2_score"]},
        )

    predictor = RadiationPredictor()
    for horizon in settings.forecast_horizons:
        pred, model, conf = predictor.predict_horizon(df, horizon)
        print(f"h={horizon}m pred={pred:.2f} model={model} conf={conf:.3f}")


if __name__ == "__main__":
    asyncio.run(main())
