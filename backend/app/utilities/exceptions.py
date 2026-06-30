class SpaceRadiationError(Exception):
    """Base exception for the space radiation forecasting system."""


class DataCollectionError(SpaceRadiationError):
    """Raised when NOAA data collection fails."""


class InsufficientDataError(SpaceRadiationError):
    """Raised when there is not enough data for ML operations."""


class ModelNotFoundError(SpaceRadiationError):
    """Raised when a trained model artifact is unavailable."""


class PredictionError(SpaceRadiationError):
    """Raised when forecast generation fails."""
