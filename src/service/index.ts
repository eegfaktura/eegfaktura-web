import {EegService} from "./eeg.service";
import {EnergyService} from "./energy.service";
import {FileService} from "./file.service";
import {ParticipantService} from "./participant.service";
import {TariffService} from "./tariff.service";
import {AuthService} from "./auth.service";

interface IApi {
  eegService: EegService
  energyService: EnergyService
  fileService: FileService
  participantService: ParticipantService
  tariffService: TariffService
  authService: AuthService
}

export const Api = {} as IApi