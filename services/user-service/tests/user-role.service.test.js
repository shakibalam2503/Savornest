jest.mock("../src/repositories/user-role.repository", () => ({
  createRole: jest.fn(),
  findRoleByUserId: jest.fn(),
  updateRole: jest.fn(),
}));

const userRoleService = require("../src/services/user-role.service");
const userRoleRepository = require("../src/repositories/user-role.repository");

describe("User Role Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createRole", () => {
    it("should create a CUSTOMER role by default", async () => {
      const expectedRole = {
        user_id: "user-123",
        role: "CUSTOMER",
      };

      userRoleRepository.createRole.mockResolvedValueOnce(expectedRole);

      const result = await userRoleService.createRole("user-123");

      expect(userRoleRepository.createRole).toHaveBeenCalledWith(
        "user-123",
        "CUSTOMER"
      );
      expect(result).toEqual(expectedRole);
    });

    it("should reject an invalid role", async () => {
      await expect(
        userRoleService.createRole("user-123", "SUPERADMIN")
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_USER_ROLE",
      });

      expect(userRoleRepository.createRole).not.toHaveBeenCalled();
    });

    it("should reject a missing user ID", async () => {
      await expect(
        userRoleService.createRole(null, "CUSTOMER")
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "USER_ID_REQUIRED",
      });
    });
  });

  describe("getRole", () => {
    it("should return the user's role", async () => {
      const expectedRole = {
        user_id: "user-123",
        role: "PROVIDER",
      };

      userRoleRepository.findRoleByUserId.mockResolvedValueOnce(expectedRole);

      const result = await userRoleService.getRole("user-123");

      expect(result).toEqual(expectedRole);
    });

    it("should return a not-found error when no role exists", async () => {
      userRoleRepository.findRoleByUserId.mockResolvedValueOnce(null);

      await expect(
        userRoleService.getRole("user-123")
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "USER_ROLE_NOT_FOUND",
      });
    });
  });

  describe("updateRole", () => {
    it("should update an existing user's role", async () => {
      const existingRole = {
        user_id: "user-123",
        role: "CUSTOMER",
      };

      const updatedRole = {
        user_id: "user-123",
        role: "PROVIDER",
      };

      userRoleRepository.findRoleByUserId.mockResolvedValueOnce(existingRole);
      userRoleRepository.updateRole.mockResolvedValueOnce(updatedRole);

      const result = await userRoleService.updateRole("user-123", "PROVIDER");

      expect(userRoleRepository.updateRole).toHaveBeenCalledWith(
        "user-123",
        "PROVIDER"
      );
      expect(result).toEqual(updatedRole);
    });

    it("should reject an invalid role update", async () => {
      await expect(
        userRoleService.updateRole("user-123", "SUPERADMIN")
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_USER_ROLE",
      });

      expect(userRoleRepository.updateRole).not.toHaveBeenCalled();
    });
  });
});