"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRequestDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_request_dto_1 = require("./create-request.dto");
class UpdateRequestDto extends (0, mapped_types_1.PartialType)(create_request_dto_1.CreateRequestDto) {
}
exports.UpdateRequestDto = UpdateRequestDto;
//# sourceMappingURL=update-request.dto.js.map